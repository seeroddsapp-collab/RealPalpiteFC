// Wrapper para a API do Asaas (PIX depósitos e saques).
// Credencial exclusivamente via ASAAS_API_KEY no .env — nunca em código.

export type PixKeyType = 'cpf' | 'phone' | 'email' | 'random_key';

export type AsaasPixPayment = {
  id: string;
  status: 'pending';
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
};

export type AsaasPaymentDetail = {
  id: string;
  status: string;
  amount: number;
  externalRef: string;
};

export type AsaasTransferResult = {
  id: string;
  status: 'processed' | 'pending';
};

const ASAAS_API = 'https://api.asaas.com/v3';

const PIX_KEY_TYPE: Record<PixKeyType, string> = {
  cpf: 'CPF',
  phone: 'PHONE',
  email: 'EMAIL',
  random_key: 'EVP',
};

export class AsaasService {
  constructor(
    private readonly apiKey: string,
    private readonly platformCpf?: string,
  ) {}

  private async req<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${ASAAS_API}${path}`, {
      method,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Asaas ${method} ${path} ${res.status}: ${err}`);
    }

    return res.json() as Promise<T>;
  }

  // Reutiliza o mesmo cliente Asaas por usuário (sem CPF obrigatório para PIX QR)
  private async findOrCreateCustomer(name: string, userRef: string): Promise<string> {
    const search = await this.req<{ data: Array<{ id: string }> }>(
      'GET',
      `/customers?externalReference=${encodeURIComponent(userRef)}`,
    );

    if (search.data?.length > 0) return search.data[0].id;

    const created = await this.req<{ id: string }>('POST', '/customers', {
      name,
      externalReference: userRef,
      ...(this.platformCpf ? { cpfCnpj: this.platformCpf } : {}),
    });
    return created.id;
  }

  async createPixDeposit(opts: {
    amount: number;
    externalRef: string;
    customerRef: string;   // ID do usuário na plataforma — reutilizado entre depósitos
    customerName: string;
    description?: string;
  }): Promise<AsaasPixPayment> {
    const customerId = await this.findOrCreateCustomer(opts.customerName, opts.customerRef);

    const dueDate = new Date(Date.now() + 30 * 60 * 1000).toISOString().split('T')[0];

    const payment = await this.req<{ id: string }>('POST', '/payments', {
      customer: customerId,
      billingType: 'PIX',
      value: opts.amount,
      dueDate,
      description: opts.description ?? 'Depósito RealPalpiteFC',
      externalReference: opts.externalRef,
    });

    const qr = await this.req<{ encodedImage: string; payload: string }>(
      'GET',
      `/payments/${payment.id}/pixQrCode`,
    );

    return {
      id: payment.id,
      status: 'pending',
      qrCode: qr.payload,
      qrCodeBase64: qr.encodedImage,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async getPayment(paymentId: string): Promise<AsaasPaymentDetail> {
    const data = await this.req<{
      id: string;
      status: string;
      value: number;
      externalReference: string;
    }>('GET', `/payments/${paymentId}`);

    return {
      id: data.id,
      status: data.status,
      amount: data.value,
      externalRef: data.externalReference,
    };
  }

  async sendPix(opts: {
    amount: number;
    pixKey: string;
    pixKeyType: PixKeyType;
    externalRef: string;
  }): Promise<AsaasTransferResult> {
    const data = await this.req<{ id: string; status: string }>('POST', '/transfers', {
      value: opts.amount,
      pixAddressKey: opts.pixKey,
      pixAddressKeyType: PIX_KEY_TYPE[opts.pixKeyType],
      description: 'Saque RealPalpiteFC',
      externalReference: opts.externalRef,
    });

    return {
      id: data.id,
      status: data.status === 'DONE' ? 'processed' : 'pending',
    };
  }
}
