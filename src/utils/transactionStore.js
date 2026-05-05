const TRANSACTION_STORAGE_KEY = "etc_store_transactions";

function normalizeTransaction(transaction, fallbackIndex = 0) {
  return {
    id:
      String(transaction?.id || "").trim() ||
      `trx-${Date.now()}-${fallbackIndex + 1}`,
    customerName: String(transaction?.customerName || "").trim(),
    customerEmail: String(transaction?.customerEmail || "").trim(),
    paymentMethod: String(transaction?.paymentMethod || "").trim(),
    paymentProof: String(transaction?.paymentProof || "").trim(),
    status: String(transaction?.status || "pending").trim().toLowerCase(),
    totalPrice: Number(transaction?.totalPrice) || 0,
    createdAt: String(transaction?.createdAt || new Date().toISOString()),
    items: Array.isArray(transaction?.items)
      ? transaction.items.map((item) => ({
          id: String(item?.id || "").trim(),
          name: String(item?.name || "").trim(),
          qty: Number(item?.qty) || 0,
          price: String(item?.price || "").trim(),
          image: String(item?.image || "").trim(),
          category: String(item?.category || "").trim(),
        }))
      : [],
  };
}

function normalizeTransactions(input) {
  if (!Array.isArray(input)) return [];

  return input.map((transaction, index) => normalizeTransaction(transaction, index));
}

function getTransactions() {
  try {
    const raw = localStorage.getItem(TRANSACTION_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeTransactions(parsed);
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  const normalized = normalizeTransactions(transactions);
  localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function addTransaction(transaction) {
  const currentTransactions = getTransactions();
  const nextTransactions = [normalizeTransaction(transaction, currentTransactions.length), ...currentTransactions];
  return saveTransactions(nextTransactions);
}

function updateTransactionStatus(transactionId, status) {
  const nextStatus = String(status || "").trim().toLowerCase();
  const currentTransactions = getTransactions();
  const nextTransactions = currentTransactions.map((transaction) =>
    transaction.id === transactionId ? { ...transaction, status: nextStatus } : transaction
  );

  return saveTransactions(nextTransactions);
}

const TransactionStore = {
  addTransaction,
  getTransactions,
  saveTransactions,
  updateTransactionStatus,
};

export default TransactionStore;
