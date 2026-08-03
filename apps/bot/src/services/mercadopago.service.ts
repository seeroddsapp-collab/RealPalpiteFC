// Wrapper para a API do Mercado Pago (Brasil).
// Credenciais exclusivamente via MP_ACCESS_TOKEN no .env — nunca em código.

export type PixKeyType = 'cpf' | 'phone' | 'email' | 'random_key';

export type MpPixPayment = {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'in_process';
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
};

export type MpPaymentDetail = {
  id: string;
  status: string;
  amount: number;
  externalRef: string;
};

export type MpTransferResult = {
  id: string;
  status: 'processed' | 'pending' | 'failed';
};

const MP_API = 'https://api.mercadopago.com';

export class MercadoPagoService {
  constructor(private readonly accessToken: string) {}

  // Cria um pagamento PIX (QR Code para depósito).
  async createPixDeposit(opts: {
    amount: number;
    externalRef: string;
    description?: string;
  }): Promise<MpPixPayment> {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const res = await fetch(`${MP_API}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': opts.externalRef,
      },
      body: JSON.stringify({
        transaction_amount: opts.amount,
        description: opts.description ?? 'Depósito RealPalpiteFC',
        payment_method_id: 'pix',
        payer: { email: 'deposito@realpalpitefc.com' },
        date_of_expiration: expiresAt,
        external_reference: opts.externalRef,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MP createPixDeposit ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      id: number;
      status: MpPixPayment['status'];
      point_of_interaction: {
        transaction_data: { qr_code: string; qr_code_base64: string };
      };
    };

    return {
      id: String(data.id),
      status: data.status,
      qrCode: data.point_of_interaction.transaction_data.qr_code,
      qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
      expiresAt,
    };
  }

  // Busca status de um pagamento (usado no webhook para confirmar).
  async getPayment(paymentId: string): Promise<MpPaymentDetail> {
    const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MP getPayment ${res.status}: ${err}`);
    }

    const data = (await res.json()) as {
      id: number;
      status: string;
      transaction_amount: number;
      external_reference: string;
    };

    return {
      id: String(data.id),
      status: data.status,
      amount: data.transaction_amount,
      externalRef: data.external_reference,
    };
  }

  // Envia PIX para a chave do usuário (saque).
  // Requer que a conta MP tenha permissão de disbursement habilitada.
  async sendPix(opts: {
    amount: number;
    pixKey: string;
    pixKeyType: PixKeyType;
    externalRef: string;
  }): Promise<MpTransferResult> {
    // Mapeia o tipo de chave para o formato da API do MP
    const keyTypeMap: Record<PixKeyType, string> = {
      cpf: 'CPF',
      phone: 'phone',
      email: 'email',
      random_key: 'alias',
    };

    const res = await fetch(`${MP_API}/v1/account/bank_transfers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': opts.externalRef,
      },
      body: JSON.stringify({
        amount: opts.amount,
        currency_id: 'BRL',
        receiver: {
          key: opts.pixKey,
          key_type: keyTypeMap[opts.pixKeyType],
        },
        external_reference: opts.externalRef,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`MP sendPix ${res.status}: ${err}`);
    }

    const data = (await res.json()) as { id: number; status: string };

    return {
      id: String(data.id),
      status: data.status === 'processed' ? 'processed' : 'pending',
    };
  }
}
