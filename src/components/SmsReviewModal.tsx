import React, { useState, useRef, useEffect } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { SmsTransaction, PaymentMode, CcPaymentSubtype, UPI_BRAND_LIST, getUpiBrandMeta, UpiBrandAppId } from '../types';
import { 
  Check, X, BrainCircuit, CreditCard, 
  ChevronDown, ChevronUp, Edit3, ArrowRight, ArrowLeft, 
  MessageSquare, ShieldCheck, Zap, RefreshCw, AlertCircle,
  Smartphone, Copy
} from 'lucide-react';

export const SmsReviewModal: React.FC = () => {
  const {
    smsQueue,
    isSmsReviewOpen,
    closeSmsReview,
    approveSmsTransaction,
    discardSmsTransaction,
    markSmsDuplicate,
    updateSmsParsedData,
    categories,
    accounts,
    currencySymbol,
    openSmsSimulator
  } = useHoneymoney();

  // Pending SMS items
  const pendingSmsList = smsQueue.filter(s => s.status === 'PENDING_REVIEW');
  const activeSms: SmsTransaction | undefined = pendingSmsList[0];

  // Card gesture state
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startXRef = useRef<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // Edit state for the current card
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showRawSms, setShowRawSms] = useState<boolean>(false);
  const [learnedBannerNotice, setLearnedBannerNotice] = useState<string | null>(null);

  // Reset view state when card changes
  useEffect(() => {
    setDragOffset(0);
    setIsDragging(false);
    setShowRawSms(false);
    setIsEditing(false);
    setLearnedBannerNotice(null);
  }, [activeSms?.id]);

  if (!isSmsReviewOpen) return null;

  // Touch and Mouse handlers for swipe gesture
  const handleDragStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX - dragOffset;
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    const currentOffset = clientX - startXRef.current;
    setDragOffset(currentOffset);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const SWIPE_THRESHOLD = 110;
    if (dragOffset > SWIPE_THRESHOLD) {
      triggerApprove();
    } else if (dragOffset < -SWIPE_THRESHOLD) {
      triggerDiscard();
    } else {
      setDragOffset(0);
    }
  };

  const triggerApprove = () => {
    if (!activeSms) return;
    // Animate out to right
    setDragOffset(400);
    setTimeout(() => {
      approveSmsTransaction(activeSms.id);
      setDragOffset(0);
    }, 200);
  };

  const triggerDiscard = () => {
    if (!activeSms) return;
    // Animate out to left
    setDragOffset(-400);
    setTimeout(() => {
      discardSmsTransaction(activeSms.id);
      setDragOffset(0);
    }, 200);
  };

  const triggerMarkDuplicate = () => {
    if (!activeSms) return;
    setDragOffset(-400);
    setTimeout(() => {
      markSmsDuplicate(activeSms.id);
      setDragOffset(0);
    }, 200);
  };

  // Helper for inline field updates
  const handleFieldChange = (key: string, value: any) => {
    if (!activeSms) return;
    updateSmsParsedData(activeSms.id, { [key]: value });

    if (key === 'cleanMerchant') {
      setLearnedBannerNotice(`System will remember "${value}" for future SMSs!`);
    }
  };

  const cardRotation = (dragOffset / 15);
  const isRightSwipe = dragOffset > 25;
  const isLeftSwipe = dragOffset < -25;
  const swipeOpacity = Math.min(1, Math.abs(dragOffset) / 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-md flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 px-1 text-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E5A93C]/20 border border-[#E5A93C]/40 flex items-center justify-center text-[#E5A93C]">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                SMS Transaction Queue
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-[#183626] border border-[#2A6245] text-[#A6CDB5]">
                  {pendingSmsList.length} pending
                </span>
              </h2>
              <p className="text-[11px] text-[#7E9A89]">Swipe right to approve, left to discard</p>
            </div>
          </div>

          <button
            onClick={closeSmsReview}
            className="w-8 h-8 rounded-full bg-[#112318] hover:bg-[#1A3827] text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-[#1E4330]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Deck Area */}
        <div className="relative flex-1 flex flex-col justify-center items-center py-2 min-h-[460px] overflow-hidden">
          {pendingSmsList.length === 0 ? (
            /* Empty State */
            <div className="w-full bg-[#0D1C14] border border-[#1E4330] rounded-3xl p-6 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-[#E5A93C]/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-[#E5A93C]">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>

              <div>
                <h3 className="text-base font-black text-white">All Caught Up!</h3>
                <p className="text-xs text-[#7E9A89] mt-1 max-w-xs mx-auto">
                  No new bank SMSs awaiting verification. When a new transaction SMS arrives, Honeymoney will parse and queue it here.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    closeSmsReview();
                    openSmsSimulator();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#173727] hover:bg-[#1E4833] border border-[#2A6245] text-xs font-bold text-[#E5A93C] flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Simulate Bank SMS or Paste Text
                </button>

                <button
                  onClick={closeSmsReview}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] text-black font-extrabold text-xs shadow-lg shadow-[#E5A93C]/25"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* Active Swipe Card */
            <div className="w-full relative flex items-center justify-center">
              {/* Ghost background card to give depth */}
              {pendingSmsList.length > 1 && (
                <div className="absolute w-[92%] h-[95%] bg-[#08130D] rounded-3xl border border-[#142A1D] -bottom-3 opacity-60 pointer-events-none scale-95" />
              )}

              {/* Main Interactive Card */}
              <div
                ref={cardRef}
                onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
                onTouchEnd={handleDragEnd}
                onMouseDown={(e) => handleDragStart(e.clientX)}
                onMouseMove={(e) => handleDragMove(e.clientX)}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                style={{
                  transform: `translateX(${dragOffset}px) rotate(${cardRotation}deg)`,
                  transition: isDragging ? 'none' : 'transform 0.25s ease-out'
                }}
                className={`w-full bg-gradient-to-b from-[#11241A] via-[#0E1E16] to-[#0A1610] border-2 rounded-3xl p-5 shadow-2xl relative cursor-grab active:cursor-grabbing overflow-hidden ${
                  isRightSwipe
                    ? 'border-emerald-500/80 shadow-emerald-950/50'
                    : isLeftSwipe
                    ? 'border-rose-500/80 shadow-rose-950/50'
                    : 'border-[#1E4330]'
                }`}
              >
                {/* Visual Swipe Glow Badges */}
                {isRightSwipe && (
                  <div
                    style={{ opacity: swipeOpacity }}
                    className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-emerald-500 text-black font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-emerald-500/30"
                  >
                    <span>Approve</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {isLeftSwipe && (
                  <div
                    style={{ opacity: swipeOpacity }}
                    className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-rose-500 text-white font-black text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-lg shadow-rose-500/30"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Discard</span>
                  </div>
                )}

                {/* Top Sender & Confidence Pill */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1A3827]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-[#183626] border border-[#2A6245] text-[#E5A93C] font-mono text-[11px] font-bold uppercase tracking-wider">
                      {activeSms.sender}
                    </span>
                    <span className="text-[11px] text-[#7E9A89]">
                      {new Date(activeSms.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Card 1 of {pendingSmsList.length}
                  </span>
                </div>

                {/* Intelligence Banner: Learned Rule vs Standard Bank SMS */}
                <div className="mt-3">
                  {activeSms.parsedData.isLearnedPattern ? (
                    <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#173727] to-[#12281D] border border-[#E5A93C]/40 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#E5A93C] shrink-0" />
                      <div className="text-[11px] text-slate-200">
                        <span className="font-bold text-[#E5A93C]">⚡ Learned from your past edit: </span>
                        <span>Matched "{activeSms.parsedData.matchedRulePattern}" → "{activeSms.parsedData.cleanMerchant}"</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#102017] border border-[#1C3E2C] flex items-center gap-2">
                      <BrainCircuit className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-[11px] text-slate-300">
                        Interpreted from bank SMS. Tap below to correct if needed.
                      </span>
                    </div>
                  )}
                </div>

                {/* Duplicate Detection Alert Banner */}
                {activeSms.duplicateCheck && (activeSms.duplicateCheck.isDuplicate || activeSms.duplicateCheck.isPossibleDuplicate) && (
                  <div 
                    className={`mt-3 p-3 rounded-2xl border ${
                      activeSms.duplicateCheck.isDuplicate
                        ? 'bg-amber-950/50 border-amber-500/70 text-amber-100 shadow-md shadow-amber-950/30'
                        : 'bg-yellow-950/40 border-yellow-500/50 text-yellow-100 shadow-md shadow-yellow-950/20'
                    }`}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${
                        activeSms.duplicateCheck.isDuplicate ? 'text-amber-400' : 'text-yellow-400'
                      }`} />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold uppercase tracking-wide text-[10px] text-amber-300">
                            {activeSms.duplicateCheck.isDuplicate ? '⚠️ Duplicate Detected' : '⚡ Possible Duplicate'}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/40 text-amber-300/80">
                            {activeSms.duplicateCheck.confidence} Confidence
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200 mt-1 leading-snug">
                          {activeSms.duplicateCheck.matchReason}
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={triggerMarkDuplicate}
                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] shadow transition-colors flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3 stroke-[3]" />
                            <span>Mark as Duplicate</span>
                          </button>
                          <button
                            type="button"
                            onClick={triggerApprove}
                            className="px-2.5 py-1.5 rounded-xl bg-[#142B1E] hover:bg-[#1B3A29] border border-[#2A6245] text-[11px] font-bold text-emerald-300 transition-colors"
                          >
                            Add as New Txn
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Editable / Interpreted Fields (Input touch isolated from drag gesture) */}
                <div 
                  className="mt-4 space-y-3"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                >
                  {/* Amount Display / Edit */}
                  <div className="text-center py-2 bg-[#09150E]/80 rounded-2xl border border-[#193A28]">
                    <span className="text-[10px] text-[#7E9A89] uppercase tracking-wider block font-medium">
                      Transaction Amount
                    </span>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <span className="text-2xl font-bold text-[#E5A93C]">{currencySymbol}</span>
                      <input
                        type="number"
                        value={activeSms.parsedData.amount}
                        onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
                        className="text-3xl font-black text-white font-mono bg-transparent text-center focus:outline-none w-40"
                      />
                    </div>
                  </div>

                  {/* Merchant Name (Core Learning Input!) */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                      <label className="flex items-center gap-1 text-[#E5A93C]">
                        <Edit3 className="w-3 h-3" />
                        Merchant Name (Learned):
                      </label>
                      <span className="text-[10px] text-[#7E9A89] font-mono truncate max-w-[150px]">
                        Raw: {activeSms.parsedData.rawMerchant}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={activeSms.parsedData.cleanMerchant}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange('cleanMerchant', val);
                          handleFieldChange('item', val);
                        }}
                        placeholder="e.g. Irani Chai"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#09150E] border border-[#234E37] focus:border-[#E5A93C] text-sm font-bold text-white focus:outline-none transition-colors"
                      />
                    </div>

                    {/* Quick suggestion shortcuts (e.g. Irani Chai, Swiggy, Coffee, Fuel) */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {['Irani Chai', 'Swiggy', 'Zomato', 'Amazon', 'Petrol Fuel', 'Uber'].map((quickName) => (
                        <button
                          key={quickName}
                          onClick={() => {
                            handleFieldChange('cleanMerchant', quickName);
                            handleFieldChange('item', quickName);
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                            activeSms.parsedData.cleanMerchant.toLowerCase() === quickName.toLowerCase()
                              ? 'bg-[#E5A93C]/20 border-[#E5A93C] text-[#E5A93C] font-bold'
                              : 'bg-[#10241A] border-[#1C3E2C] text-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {quickName}
                        </button>
                      ))}
                    </div>

                    {learnedBannerNotice && (
                      <div className="mt-1.5 text-[11px] text-[#E5A93C] font-medium flex items-center gap-1 animate-pulse">
                        <Zap className="w-3 h-3" />
                        {learnedBannerNotice}
                      </div>
                    )}
                  </div>

                  {/* Category Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                      {categories.map((cat) => {
                        const isSelected = activeSms.parsedData.categoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleFieldChange('categoryId', cat.id)}
                            className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                              isSelected
                                ? 'bg-[#1E4531] border-[#E5A93C] text-white shadow-sm'
                                : 'bg-[#09150E] border-[#193A28] text-slate-400 hover:text-white'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Account & Payment Route */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Account / Card</label>
                      <select
                        value={activeSms.parsedData.accountId}
                        onChange={(e) => handleFieldChange('accountId', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#09150E] border border-[#1E4330] text-xs font-medium text-slate-200 focus:outline-none"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} {acc.lastFour ? `(..${acc.lastFour})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Payment Method</label>
                      <select
                        value={activeSms.parsedData.ccPaymentSubtype || activeSms.parsedData.paymentMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (['DIRECT_SWIPE', 'UPI_ON_CREDIT_CARD', 'ONLINE', 'AUTO_DEBIT'].includes(val)) {
                            handleFieldChange('paymentMode', 'CREDIT_CARD');
                            handleFieldChange('ccPaymentSubtype', val as CcPaymentSubtype);
                          } else {
                            handleFieldChange('paymentMode', val as PaymentMode);
                            handleFieldChange('ccPaymentSubtype', undefined);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#09150E] border border-[#1E4330] text-xs font-medium text-slate-200 focus:outline-none"
                      >
                        <option value="UPI_ON_CREDIT_CARD">UPI on RuPay CC</option>
                        <option value="DIRECT_SWIPE">Direct POS Swipe</option>
                        <option value="ONLINE">Online Card Txn</option>
                        <option value="UPI">Standard UPI</option>
                        <option value="DEBIT_CARD">Debit Card</option>
                        <option value="AUTO_DEBIT">Auto-Debit / EMI</option>
                      </select>
                    </div>
                  </div>

                  {/* Dedicated UPI App Selector (PhonePe, super.money, GPay, Paytm, CRED, BHIM) */}
                  {(activeSms.parsedData.ccPaymentSubtype === 'UPI_ON_CREDIT_CARD' || 
                    activeSms.parsedData.paymentMode === 'UPI' ||
                    activeSms.parsedData.upiBrandId) && (
                    <div className="p-2.5 rounded-xl bg-[#09150E] border border-[#1A3827] space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-[#E5A93C]" />
                          <span>UPI App:</span>
                        </span>
                        {activeSms.parsedData.upiBrandId ? (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                            getUpiBrandMeta(activeSms.parsedData.upiBrandId)?.bgClass || 'bg-emerald-950/60'
                          } ${
                            getUpiBrandMeta(activeSms.parsedData.upiBrandId)?.textClass || 'text-emerald-300'
                          } ${
                            getUpiBrandMeta(activeSms.parsedData.upiBrandId)?.borderClass || 'border-emerald-500/40'
                          }`}>
                            {getUpiBrandMeta(activeSms.parsedData.upiBrandId)?.badgeLabel}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#7E9A89]">Tap app below:</span>
                        )}
                      </div>

                      {/* 1-Tap UPI App Selection Chips */}
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                        {UPI_BRAND_LIST.map((brand) => {
                          const isSelected = activeSms.parsedData.upiBrandId === brand.id;
                          return (
                            <button
                              key={brand.id}
                              type="button"
                              onClick={() => {
                                handleFieldChange('upiBrandId', brand.id);
                                handleFieldChange('upiAppId', `upi-${brand.id}`);
                                if (activeSms.parsedData.paymentMode !== 'UPI') {
                                  handleFieldChange('ccPaymentSubtype', 'UPI_ON_CREDIT_CARD');
                                }
                              }}
                              className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? `${brand.bgClass} ${brand.textClass} ${brand.borderClass} ring-1 ring-[#E5A93C] shadow-sm`
                                  : 'bg-[#10241A] border-[#1C3E2C] text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brand.dotColor }} />
                              <span>{brand.shortName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Collapsible Raw SMS Snippet */}
                  <div className="pt-1">
                    <button
                      onClick={() => setShowRawSms(!showRawSms)}
                      className="text-[11px] text-[#7E9A89] hover:text-[#A6CDB5] flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{showRawSms ? 'Hide Raw SMS text' : 'View Raw SMS text'}</span>
                      {showRawSms ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    {showRawSms && (
                      <div className="mt-1.5 p-2 rounded-xl bg-[#060D09] border border-[#162E21] font-mono text-[10px] text-slate-300 leading-relaxed break-words">
                        {activeSms.rawBody}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Gesture Hint */}
                <div className="mt-4 pt-3 border-t border-[#183626] flex items-center justify-between text-[11px] text-[#7E9A89]">
                  <span className="flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3 text-rose-400" />
                    Swipe left to discard
                  </span>
                  <span className="flex items-center gap-1 text-[#E5A93C] font-semibold">
                    Swipe right to approve
                    <ArrowRight className="w-3 h-3 text-[#E5A93C]" />
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Explicit Action Buttons (for non-gesture users) */}
        {pendingSmsList.length > 0 && (
          <div className="pt-2 pb-1 space-y-2">
            {activeSms?.duplicateCheck?.isDuplicate && (
              <button
                onClick={triggerMarkDuplicate}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Mark as Duplicate (Don't Create Second Transaction)</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={triggerDiscard}
                className="py-3 px-4 rounded-2xl bg-[#16211B] hover:bg-[#202E26] border border-[#2A3E33] text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>Discard (Left)</span>
              </button>

              <button
                onClick={triggerApprove}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] hover:from-[#d89e33] hover:to-[#e8ba58] text-black font-extrabold text-xs shadow-lg shadow-[#E5A93C]/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{activeSms?.duplicateCheck?.isDuplicate ? 'Approve As New' : 'Approve & Save (Right)'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
