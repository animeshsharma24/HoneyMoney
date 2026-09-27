import React, { useState } from 'react';
import { useHoneymoney } from '../context/HoneymoneyContext';
import { 
  X, MessageSquare, Send, BrainCircuit, 
  Trash2, Plus, Zap, CheckCircle2, Copy
} from 'lucide-react';

export const SmsSimulatorModal: React.FC = () => {
  const {
    isSmsSimulatorOpen,
    closeSmsSimulator,
    addIncomingSms,
    openSmsReview,
    merchantRules,
    deleteMerchantRule,
    addMerchantRule,
    categories
  } = useHoneymoney();

  const [activeTab, setActiveTab] = useState<'SIMULATE' | 'LEARNED_RULES'>('SIMULATE');
  const [customText, setCustomText] = useState<string>('');
  const [customSender, setCustomSender] = useState<string>('HDFCBK');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New rule creation form
  const [newPattern, setNewPattern] = useState<string>('');
  const [newMerchant, setNewMerchant] = useState<string>('');
  const [newCatId, setNewCatId] = useState<string>(categories[0]?.id || 'cat-food');

  if (!isSmsSimulatorOpen) return null;

  const sampleSmsTemplates = [
    {
      title: 'super.money: RuPay Credit Card UPI at Zepto',
      sender: 'SBICRD',
      text: 'SBI RuPay Card xx5210 debited by INR 195.00 via super.money UPI to ZEPTO QUICK STORE on 25-Sep-26. Total unbilled: INR 15,215. Ref: 9940192.'
    },
    {
      title: 'PhonePe: RuPay CC UPI at Irani Chai (Learned)',
      sender: 'SBIINB',
      text: 'Dear SBI UPI User, A/C debited by INR 40.00 on 25-Sep-26 to VPA 98210344@paytm via PhonePe. UPI Ref 4291882190. Avl Bal: Rs 14,190.'
    },
    {
      title: 'Google Pay: RuPay CC UPI at Zomato',
      sender: 'ICICIB',
      text: 'ICICI Bank Coral RuPay CC xx5210 used for INR 480.00 via Google Pay UPI to ZOMATO on 25-Sep-26. Total unbilled: INR 15,320.'
    },
    {
      title: 'CRED: RuPay CC UPI at Starbucks',
      sender: 'HDFCBK',
      text: 'HDFC Bank RuPay CC xx4590 spent Rs 340.00 via CRED UPI at STARBUCKS COFFEE on 25-SEP-26. Avl Limit: Rs 83,860. Ref: CRD88192.'
    },
    {
      title: 'HDFC CC: POS 402919 (Direct Swipe: Irani Chai)',
      sender: 'HDFCBK',
      text: 'Alert: Rs 80.00 spent on your HDFC Bank Card ending 4590 at POS 402919 MUMBAI on 25-SEP-26. Avl bal: Rs 84,120. Ref: TXN948199.'
    },
    {
      title: 'Axis CC Online: Amazon Shopping',
      sender: 'AXISBK',
      text: 'INR 2,499.00 spent on Axis Bank CC xx4092 at AMZN MKTP IN MUMBAI on 25-Sep-26. Avl Limit: Rs 2,09,501.'
    },
    {
      title: 'SBI CC Direct Swipe: Petrol Station',
      sender: 'SBICRD',
      text: 'Rs 1,500.00 spent on your SBI Credit Card ending 5210 at INDIAN OIL STATION PUNE on 25-Sep-26. Ref: 8810294.'
    },
    {
      title: 'New Cryptic Merchant (Test Learning)',
      sender: 'KOTAKB',
      text: 'Kotak Bank Alert: INR 180.00 debited from CC xx5210 at POS 889211 CAFE CORNER on 25-SEP-26. Call 1860 for fraud.'
    }
  ];

  const handleSimulate = async (smsText: string, senderName: string) => {
    setIsProcessing(true);
    try {
      await addIncomingSms(smsText, senderName);
      setSuccessToast(`Parsed & queued new SMS card!`);
      setTimeout(() => {
        setSuccessToast(null);
        closeSmsSimulator();
        openSmsReview();
      }, 700);
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim() || !newMerchant.trim()) return;

    addMerchantRule({
      pattern: newPattern.trim(),
      cleanMerchant: newMerchant.trim(),
      defaultItem: newMerchant.trim(),
      defaultCategoryId: newCatId
    });

    setNewPattern('');
    setNewMerchant('');
    setSuccessToast(`Added rule: ${newPattern} → ${newMerchant}`);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-lg bg-[#0C1A13] border border-[#1E4330] rounded-3xl p-5 space-y-4 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#183626]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#E5A93C]/20 border border-[#E5A93C]/40 flex items-center justify-center text-[#E5A93C]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white">SMS Simulator & Merchant Learning</h2>
              <p className="text-[11px] text-[#7E9A89]">Test bank SMS parser and inspect learned merchant rules</p>
            </div>
          </div>

          <button
            onClick={closeSmsSimulator}
            className="w-8 h-8 rounded-full bg-[#112318] hover:bg-[#1A3827] text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-[#1E4330]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex p-1 rounded-2xl bg-[#07110C] border border-[#163022]">
          <button
            onClick={() => setActiveTab('SIMULATE')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'SIMULATE'
                ? 'bg-[#183626] text-[#E5A93C] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Simulate & Paste SMS
          </button>
          <button
            onClick={() => setActiveTab('LEARNED_RULES')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'LEARNED_RULES'
                ? 'bg-[#183626] text-[#E5A93C] shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Learned Rules ({merchantRules.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-1">
          {successToast && (
            <div className="p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {activeTab === 'SIMULATE' ? (
            <div className="space-y-4">
              {/* Custom SMS Paste Box */}
              <div className="p-3.5 rounded-2xl bg-[#07120D] border border-[#1A3A28] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                  <span className="flex items-center gap-1.5 text-[#E5A93C]">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Paste Any Bank SMS Text
                  </span>
                  <input
                    type="text"
                    value={customSender}
                    onChange={(e) => setCustomSender(e.target.value.toUpperCase())}
                    placeholder="SENDER"
                    className="w-24 px-2 py-0.5 rounded-md bg-[#0D1C14] border border-[#234E37] text-[11px] font-mono text-[#E5A93C] text-center focus:outline-none"
                  />
                </div>

                <textarea
                  rows={3}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Paste transaction SMS here (e.g. 'Alert: Rs 340.00 spent on Card ending 4590 at POS 402919 MUMBAI on 25-SEP-26...')"
                  className="w-full p-2.5 rounded-xl bg-[#0D1C14] border border-[#234E37] text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:border-[#E5A93C] focus:outline-none"
                />

                <button
                  disabled={!customText.trim() || isProcessing}
                  onClick={() => handleSimulate(customText, customSender)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#E5A93C] to-[#E5A93C] disabled:opacity-50 text-black font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#E5A93C]/25 transition-transform active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Parse & Review In Swipe Deck</span>
                </button>
              </div>

              {/* Preset Bank Samples */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">
                  Or Test with Sample Bank SMSs:
                </span>
                <div className="space-y-2">
                  {sampleSmsTemplates.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-[#09150E] border border-[#183626] hover:border-[#2A6245] transition-all flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                          <span className="text-[#E5A93C]">{item.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#132B1E] text-slate-300">
                            {item.sender}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-300 bg-[#060D09] p-2 rounded-xl border border-[#142A1D] break-words">
                          {item.text}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSimulate(item.text, item.sender)}
                        className="py-1.5 px-3 rounded-xl bg-[#173727] hover:bg-[#1E4833] border border-[#2B6044] text-[11px] font-bold text-[#E5A93C] self-end flex items-center gap-1.5 transition-colors"
                      >
                        <Send className="w-3 h-3" />
                        <span>Simulate This SMS</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Learned Rules Tab */
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#09150E] border border-[#193A28] text-xs text-slate-300 space-y-1">
                <span className="font-bold text-[#E5A93C] flex items-center gap-1.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  Background Continuous Learning
                </span>
                <p className="text-[11px] text-[#7E9A89]">
                  Whenever you edit a cryptic SMS merchant code (e.g. changing 402919 to Irani Chai), Honeymoney saves the mapping below. Future SMSs automatically resolve without manual typing!
                </p>
              </div>

              {/* Add New Rule Manually */}
              <form onSubmit={handleCreateRule} className="p-3.5 rounded-2xl bg-[#07120D] border border-[#1A3A28] space-y-2.5">
                <span className="text-xs font-bold text-white block">Add Manual Merchant Rule</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Pattern (e.g. 402919)"
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0D1C14] border border-[#234E37] text-xs font-mono text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Clean Name (e.g. Irani Chai)"
                    value={newMerchant}
                    onChange={(e) => setNewMerchant(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-[#0D1C14] border border-[#234E37] text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={newCatId}
                    onChange={(e) => setNewCatId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#0D1C14] border border-[#234E37] text-xs text-slate-200 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#E5A93C] hover:bg-[#F3C766] text-black font-extrabold text-xs flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Add</span>
                  </button>
                </div>
              </form>

              {/* Existing Learned Rules List */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">Active Learned Mappings</span>
                {merchantRules.map((rule) => {
                  const cat = categories.find(c => c.id === rule.defaultCategoryId);
                  return (
                    <div
                      key={rule.id}
                      className="p-3 rounded-2xl bg-[#0D1C14] border border-[#1A3827] flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{rule.cleanMerchant}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#163524] text-[#E5A93C] border border-[#2B5E43]">
                            matches: {rule.pattern}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#7E9A89]">
                          {cat?.name || 'Food'} • Applied {rule.timesApplied}x
                        </div>
                      </div>

                      <button
                        onClick={() => deleteMerchantRule(rule.id)}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#1A2E22] flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
