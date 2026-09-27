import React from 'react';
import { HoneymoneyProvider, useHoneymoney } from './context/HoneymoneyContext';
import { Navigation } from './components/Navigation';
import { HomeView } from './components/HomeView';
import { TransactionsView } from './components/TransactionsView';
import { CreditCardsView } from './components/CreditCardsView';
import { AnalyticsView } from './components/AnalyticsView';
import { AccountsView } from './components/AccountsView';
import { BudgetsView } from './components/BudgetsView';
import { RecurringView } from './components/RecurringView';
import { SettingsView } from './components/SettingsView';
import { TransactionFormModal } from './components/TransactionFormModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SmsReviewModal } from './components/SmsReviewModal';
import { SmsSimulatorModal } from './components/SmsSimulatorModal';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab,
    isTransactionModalOpen,
    closeTransactionModal,
    isSmsReviewOpen,
    closeSmsReview,
    isSmsSimulatorOpen,
    closeSmsSimulator
  } = useHoneymoney();

  // Handle Android Back Gesture / Button Navigation
  React.useEffect(() => {
    const handleBack = (): boolean => {
      // 1. If More Sheet drawer is open, close it
      const moreSheetClose = document.querySelector('[data-more-sheet-close]') as HTMLButtonElement | null;
      if (moreSheetClose) {
        moreSheetClose.click();
        return true;
      }

      // 2. If any modal is open, close it
      if (isTransactionModalOpen) {
        closeTransactionModal();
        return true;
      }
      if (isSmsReviewOpen) {
        closeSmsReview();
        return true;
      }
      if (isSmsSimulatorOpen) {
        closeSmsSimulator();
        return true;
      }

      // 3. If user is on any sub-tab (History, Cards, Analytics, Accounts, Budgets, Subscriptions, Settings)
      // Navigate back to the Home tab
      if (activeTab !== 'HOME') {
        setActiveTab('HOME');
        return true;
      }

      // 4. User is on Home with no modals open: let native Android handle exit confirmation
      return false;
    };

    // Expose handler for MainActivity evaluateJavascript
    (window as any).__handleAndroidBack = handleBack;

    // Also support browser popstate events
    const onPopState = (e: PopStateEvent) => {
      const handled = handleBack();
      if (handled) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.href);
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);

    return () => {
      delete (window as any).__handleAndroidBack;
      window.removeEventListener('popstate', onPopState);
    };
  }, [
    activeTab,
    setActiveTab,
    isTransactionModalOpen,
    closeTransactionModal,
    isSmsReviewOpen,
    closeSmsReview,
    isSmsSimulatorOpen,
    closeSmsSimulator
  ]);

  return (
    <div className="min-h-screen bg-[#050806] text-slate-100 flex flex-col items-center justify-start select-none">
      {/* Mobile-First App Container */}
      <div className="w-full max-w-lg flex flex-col bg-[#070B09] min-h-screen border-x border-[#14261B]/60 shadow-2xl shadow-black">
        {/* Navigation & Header */}
        <Navigation />

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-y-auto no-scrollbar">
          {activeTab === 'HOME' && <HomeView />}
          {activeTab === 'TRANSACTIONS' && <TransactionsView />}
          {activeTab === 'CARDS' && <CreditCardsView />}
          {activeTab === 'ANALYTICS' && <AnalyticsView />}
          {activeTab === 'ACCOUNTS' && <AccountsView />}
          {activeTab === 'BUDGETS' && <BudgetsView />}
          {activeTab === 'RECURRING' && <RecurringView />}
          {activeTab === 'SETTINGS' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals */}
      <TransactionFormModal />
      <OnboardingModal />
      <SmsReviewModal />
      <SmsSimulatorModal />
    </div>
  );
};

export default function App() {
  return (
    <HoneymoneyProvider>
      <AppContent />
    </HoneymoneyProvider>
  );
}
