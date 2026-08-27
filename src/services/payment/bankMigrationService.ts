import { featureFlags } from '../../featureFlags';

export interface PaymentAuditRecord {
  orderId: string;
  paymentId: string | number;
  provider: string;
  amount: number;
  method: 'pix' | 'credit_card' | 'debit_card' | 'crediario';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  idempotencyKey?: string;
  timestamp: string;
  reconciled: boolean;
  notes?: string;
}

class BankMigrationService {
  private auditLogs: PaymentAuditRecord[] = [];

  /**
   * Registra uma transação de pagamento para fins de auditoria e futura migração bancária
   */
  public recordTransaction(record: Omit<PaymentAuditRecord, 'timestamp' | 'reconciled'>): PaymentAuditRecord {
    const fullRecord: PaymentAuditRecord = {
      ...record,
      timestamp: new Date().toISOString(),
      reconciled: record.status === 'approved',
    };

    this.auditLogs.push(fullRecord);
    console.log(`[BankMigrationService] Audit Log registrado para Pedido #${record.orderId} (${record.provider})`);
    return fullRecord;
  }

  /**
   * Reconciliação Estrita: Cruza os IDs de pedidos com os identificadores do gateway
   */
  public reconcileTransaction(orderId: string, paymentId: string | number, status: PaymentAuditRecord['status']): boolean {
    const item = this.auditLogs.find(
      r => String(r.orderId) === String(orderId) || String(r.paymentId) === String(paymentId)
    );

    if (item) {
      item.status = status;
      item.reconciled = status === 'approved';
      item.notes = `Reconciliado em ${new Date().toISOString()}`;
      return true;
    }
    return false;
  }

  /**
   * Gera relatório de auditoria e reconciliação dos repasses
   */
  public getAuditReport() {
    const totalTransactions = this.auditLogs.length;
    const approved = this.auditLogs.filter(l => l.status === 'approved').length;
    const pending = this.auditLogs.filter(l => l.status === 'pending').length;
    const rejected = this.auditLogs.filter(l => l.status === 'rejected' || l.status === 'cancelled').length;

    const totalApprovedVolume = this.auditLogs
      .filter(l => l.status === 'approved')
      .reduce((sum, l) => sum + l.amount, 0);

    return {
      totalTransactions,
      approvedCount: approved,
      pendingCount: pending,
      rejectedCount: rejected,
      totalApprovedVolume,
      activeProvider: import.meta.env.VITE_PAYMENT_PROVIDER || 'Mercado Pago',
      newBankRolloutPercentage: featureFlags.newBankRolloutPercentage,
      logs: [...this.auditLogs],
    };
  }
}

export const bankMigrationService = new BankMigrationService();
