import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ChatHeader from '../components/chat/ChatHeader';
import ChatInput from '../components/chat/ChatInput';
import { BotAvatar, BotAvatarPlaceholder, BotBubble, CardBubble, UserBubble, DateDivider } from '../components/chat/ChatBubble';

// ─── Conversation flow definition ─────────────────────────────────────────────
// Each step produces a bot message. `choices` renders quick-reply buttons.
// `freeText: true` shows the input bar instead of choices.
// `isSummary: true` renders the order summary card.

function buildFlow(isTh, ctx) {
  return [
    {
      // step 0 — booking confirmed, auto-advance
      kind: 'booking-confirm',
      autoAdvance: true,
    },
    {
      // step 1 — service type
      kind: 'question',
      text: isTh ? 'ต้องการบริการแบบไหนครับ?' : 'Which service do you need?',
      choices: [
        { value: 'normal',  label: isTh ? 'งานปกติ'  : 'Normal',  icon: 'local_laundry_service', desc: isTh ? '2–3 วันทำการ' : '2–3 days' },
        { value: 'express', label: isTh ? 'งานด่วน ⚡' : 'Express ⚡', icon: 'bolt',                desc: isTh ? 'ได้ภายในวันนี้' : 'Same day' },
      ],
      answerKey: 'serviceType',
    },
    {
      // step 2 — detergent
      kind: 'question',
      text: isTh ? 'เลือกน้ำยาซักผ้าได้เลยครับ' : 'Choose your detergent.',
      choices: [
        { value: 'powder',  label: isTh ? 'ผงซักฟอก'    : 'Powder',    icon: 'science' },
        { value: 'liquid',  label: isTh ? 'น้ำยาซักผ้า'  : 'Liquid',    icon: 'water_drop' },
        { value: 'hypo',    label: isTh ? 'สูตรอ่อนโยน'  : 'Sensitive', icon: 'spa' },
        { value: 'eco',     label: isTh ? 'อีโค'          : 'Eco',       icon: 'eco' },
      ],
      answerKey: 'detergent',
    },
    {
      // step 3 — special instructions (free text, skippable)
      kind: 'question',
      text: isTh
        ? 'มีคำแนะนำพิเศษเพิ่มเติมมั้ยครับ? เช่น ซักน้ำเย็น ไม่รีด'
        : 'Any special instructions? e.g. cold wash, no ironing.',
      freeText: true,
      skipLabel: isTh ? 'ไม่มี ข้ามได้เลย' : 'No, skip',
      answerKey: 'instructions',
    },
    {
      // step 4 — summary + confirm
      kind: 'summary',
      text: isTh ? 'สรุปออเดอร์ของคุณครับ ✅' : "Here's your order summary ✅",
      confirmLabel: isTh ? 'ยืนยันออเดอร์' : 'Confirm Order',
      answerKey: null,
    },
    {
      // step 5 — done
      kind: 'done',
      text: isTh
        ? 'รับออเดอร์แล้วครับ! เราจะมารับผ้าตามนัดหมาย 🧺'
        : "Order received! We'll pick up as scheduled 🧺",
    },
  ];
}

// ─── Helper — format date ──────────────────────────────────────────────────────
function fmtDate(dateStr, isTh) {
  if (!dateStr) return '—';
  const locale = isTh ? 'th-TH-u-ca-buddhist' : 'en-GB';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Content renderers (page-specific) ────────────────────────────────────────

function FinalSummaryContent({ answers, date, time, isTh }) {
  const serviceLabel = { normal: isTh ? 'งานปกติ' : 'Normal', express: isTh ? 'งานด่วน ⚡' : 'Express ⚡' };
  const detergentLabel = { powder: isTh ? 'ผงซักฟอก' : 'Powder', liquid: isTh ? 'น้ำยาซักผ้า' : 'Liquid', hypo: isTh ? 'สูตรอ่อนโยน' : 'Sensitive', eco: isTh ? 'อีโค' : 'Eco' };
  return (
    <>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="material-symbols-outlined fill-icon text-secondary text-[14px]">check_circle</span>
        <p className="font-body text-xs font-semibold text-on-surface">{isTh ? 'รับออเดอร์แล้วครับ!' : 'Order received!'}</p>
      </div>
      {/* Booking info */}
      <div className="bg-surface-container-high rounded-lg px-2.5 py-2 mb-2 border-l-[3px] border-primary">
        <p className="font-label text-[9px] text-primary font-semibold uppercase tracking-wide mb-0.5">
          {isTh ? 'การจอง' : 'Appointment'}
        </p>
        <p className="font-headline font-bold text-sm text-on-surface leading-tight">{date}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-on-surface-variant text-[11px]">schedule</span>
          <p className="font-body text-xs text-on-surface-variant">{time}</p>
        </div>
      </div>
      {/* Order details */}
      <div className="space-y-1">
        {[
          { icon: 'speed',    value: serviceLabel[answers.serviceType] },
          { icon: 'science',  value: detergentLabel[answers.detergent] },
          ...(answers.instructions ? [{ icon: 'edit_note', value: answers.instructions }] : []),
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[12px]">{r.icon}</span>
            <p className="font-body text-[11px] text-on-surface-variant">{r.value}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function BookingConfirmContent({ date, time, isTh }) {
  return (
    <>
      <p className="font-body text-xs text-on-surface mb-2">
        {isTh ? 'จองรับผ้าเรียบร้อยแล้วครับ' : 'Pickup booking confirmed!'}
      </p>
      <div className="bg-surface-container-high rounded-lg px-2.5 py-2 mb-2 border-l-[3px] border-primary">
        <p className="font-label text-[9px] text-primary font-semibold uppercase tracking-wide mb-0.5">
          {isTh ? 'การจองใหม่' : 'New Booking'}
        </p>
        <p className="font-headline font-bold text-sm text-on-surface leading-tight">{date}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="material-symbols-outlined text-on-surface-variant text-[11px]">schedule</span>
          <p className="font-body text-xs text-on-surface-variant">{time}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined fill-icon text-secondary text-[14px]">check_circle</span>
        <p className="font-body text-xs text-on-surface">{isTh ? 'เรียบร้อยแล้วครับ' : 'All set!'}</p>
      </div>
    </>
  );
}

function SummaryContent({ answers, date, time, isTh }) {
  const serviceLabel = { normal: isTh ? 'งานปกติ' : 'Normal', express: isTh ? 'งานด่วน' : 'Express' };
  const detergentLabel = {
    powder: isTh ? 'ผงซักฟอก' : 'Powder',
    liquid: isTh ? 'น้ำยาซักผ้า' : 'Liquid',
    hypo:   isTh ? 'สูตรอ่อนโยน' : 'Sensitive',
    eco:    isTh ? 'อีโค' : 'Eco',
  };
  const rows = [
    { icon: 'calendar_today', label: isTh ? 'วันที่' : 'Date',        value: date },
    { icon: 'schedule',       label: isTh ? 'เวลา' : 'Time',          value: time },
    { icon: 'speed',          label: isTh ? 'บริการ' : 'Service',     value: serviceLabel[answers.serviceType] || '—' },
    { icon: 'science',        label: isTh ? 'น้ำยา' : 'Detergent',    value: detergentLabel[answers.detergent] || '—' },
    ...(answers.instructions ? [{ icon: 'edit_note', label: isTh ? 'หมายเหตุ' : 'Note', value: answers.instructions }] : []),
  ];
  return (
    <>
      <p className="font-body text-xs text-on-surface mb-2">{isTh ? 'สรุปออเดอร์ของคุณครับ' : "Here's your order summary"}</p>
      <div className="space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-[12px] mt-px">{r.icon}</span>
            <p className="font-body text-[11px] text-on-surface-variant leading-tight">
              <span className="font-semibold text-on-surface">{r.label}: </span>{r.value}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function OrderChat({ userData, appointmentDate, appointmentTime, onClose }) {
  const { i18n } = useTranslation();
  const isTh = i18n.language === 'th';

  const displayName = userData?.customerName
    || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim();
  const customerId = userData?.customerId || userData?.uuid || '';
  const fmtAppointmentDate = fmtDate(appointmentDate, isTh);

  const flow = buildFlow(isTh, {});

  // chatLog: array of { id, type: 'bot'|'user', stepIndex?, text?, imageUrl?, ... }
  const [chatLog, setChatLog] = useState([
    { id: 1, type: 'bot', stepIndex: 0, showAvatar: true, timestamp: nowTime() },
  ]);
  const [flowStep, setFlowStep] = useState(0);   // which step bot is currently on
  const [answers, setAnswers] = useState({});
  const [inputText, setInputText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [done, setDone] = useState(false);

  const bottomRef = useRef(null);

  // Auto-advance step 0 (booking-confirm has no user input)
  useEffect(() => {
    if (flowStep === 0 && flow[0].autoAdvance) {
      const t = setTimeout(() => advanceFlow(0, null), 600);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  function nowTime() {
    return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  // Advance bot to next step after user answered stepIndex
  function advanceFlow(answeredStep, answerValue) {
    const nextStep = answeredStep + 1;
    if (nextStep >= flow.length) return;
    setFlowStep(nextStep);
    setChatLog(prev => [
      ...prev,
      { id: Date.now(), type: 'bot', stepIndex: nextStep, showAvatar: false, timestamp: nowTime() },
    ]);
  }

  // User picks a choice button
  function handleChoice(stepIndex, choice) {
    const step = flow[stepIndex];
    setAnswers(prev => ({ ...prev, [step.answerKey]: choice.value }));
    advanceFlow(stepIndex, choice.value);
  }

  // User submits free text or skips
  function handleFreeText(text, skipped = false) {
    const step = flow[flowStep];
    const value = skipped ? '' : text.trim();
    setAnswers(prev => ({ ...prev, [step.answerKey]: value }));
    setInputText('');
    advanceFlow(flowStep, value);
  }

  // Confirm order — clear history, show combined final card
  function handleConfirm() {
    setDone(true);
    setChatLog([
      { id: Date.now(), type: 'bot', stepIndex: -1, showAvatar: true, timestamp: nowTime() },
    ]);
    setFlowStep(flow.length); // past end → no more steps
  }

  // Send free-text message (only active during freeText steps)
  function handleSend() {
    const trimmed = inputText.trim();
    if (!trimmed && !imageFile) return;
    if (imageFile) {
      URL.revokeObjectURL(imageFile.previewUrl);
      setImageFile(null);
      setInputText('');
      advanceFlow(flowStep, trimmed);
      return;
    }
    handleFreeText(trimmed);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function removeImage() {
    if (imageFile) URL.revokeObjectURL(imageFile.previewUrl);
    setImageFile(null);
  }

  const currentStep = flow[flowStep];
  const isFreeTextStep = (currentStep?.freeText && !done) || done;
  const isChoiceStep = currentStep?.choices && !done;
  const isSummaryStep = currentStep?.kind === 'summary' && !done;

  return (
    <div className="h-full flex flex-col bg-surface-container-lowest overflow-hidden">

      <ChatHeader
        displayName={displayName}
        customerId={customerId}
        isTh={isTh}
        onClose={onClose}
      />

      {/* ── Chat area ── */}
      <main className="flex-1 overflow-y-auto no-scrollbar px-4 py-2">
        <DateDivider label={isTh ? 'วันนี้' : 'Today'} />

        {chatLog.map((entry, idx) => {
          if (entry.type === 'user') {
            return <UserBubble key={entry.id} message={entry} />;
          }

          // Bot entry — stepIndex -1 = final confirmed summary
          if (entry.stepIndex === -1) {
            return (
              <div key={entry.id} className="mb-1">
                <div className="flex items-end gap-1.5">
                  <BotAvatar />
                  <BotBubble timestamp={entry.timestamp}>
                    <FinalSummaryContent answers={answers} date={fmtAppointmentDate} time={appointmentTime || '—'} isTh={isTh} />
                  </BotBubble>
                </div>
              </div>
            );
          }

          const step = flow[entry.stepIndex];
          const isLastBotMsg = idx === chatLog.length - 1 || chatLog.slice(idx + 1).every(e => e.type === 'user');
          const isActive = entry.stepIndex === flowStep && isLastBotMsg;

          return (
            <div key={entry.id} className="mb-1">
              <div className="flex items-end gap-1.5">
                {entry.showAvatar ? <BotAvatar /> : <BotAvatarPlaceholder />}

                {/* question / summary → CardBubble with inline buttons */}
                {(step.kind === 'question' || step.kind === 'summary') ? (
                  <CardBubble
                    text={step.kind === 'summary' ? null : step.text}
                    choices={step.choices}
                    confirmLabel={step.kind === 'summary' ? step.confirmLabel : null}
                    skipLabel={step.freeText ? step.skipLabel : null}
                    isActive={isActive}
                    onPick={(c) => handleChoice(entry.stepIndex, c)}
                    onConfirm={handleConfirm}
                    onSkip={() => handleFreeText('', true)}
                  >
                    {step.kind === 'summary' && (
                      <SummaryContent answers={answers} date={fmtAppointmentDate} time={appointmentTime || '—'} isTh={isTh} />
                    )}
                  </CardBubble>
                ) : (
                  /* booking-confirm / done → plain BotBubble */
                  <BotBubble timestamp={entry.timestamp}>
                    {step.kind === 'booking-confirm' && (
                      <BookingConfirmContent date={fmtAppointmentDate} time={appointmentTime || '—'} isTh={isTh} />
                    )}
                    {step.kind === 'done' && (
                      <p className="font-body text-xs text-on-surface leading-relaxed">{step.text}</p>
                    )}
                  </BotBubble>
                )}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </main>

      {isFreeTextStep && (
        <ChatInput
          inputText={inputText}
          imageFile={imageFile}
          placeholder={done ? (isTh ? 'พิมพ์ข้อความ...' : 'Type a message...') : (isTh ? 'พิมพ์คำแนะนำพิเศษ...' : 'Type special instructions...')}
          onChange={setInputText}
          onKeyDown={handleKey}
          onSend={handleSend}
          onImagePick={(file) => { if (file) setImageFile({ file, previewUrl: URL.createObjectURL(file) }); }}
          onRemoveImage={removeImage}
        />
      )}

    </div>
  );
}
