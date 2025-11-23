// Dashboard and Account Types

export interface FamilyMember {
    id: string;
    name: string;
    avatar?: string;
    role: string;
    color: string;
}

export interface AccountLiabilities {
    apr: string;
    aprType: string;
    aprBalanceSubjectToApr: string;
    aprInterestChargeAmount: string;
    limit: string;
    min_due: string;
    last_statement: string;
    next_due_date: string;
    last_statement_date: string;
    last_payment_amount: string;
    last_payment_date: string;
    status: string;
}

export interface Account {
    id: string;
    userId: string;
    bank: string;
    name: string;
    balance: number;
    due: string;
    type?: string | null;
    color: string;
    liabilities: AccountLiabilities;
}

export interface PlaidAccount {
    id: string;
    accountId: string;
    name: string;
    officialName?: string | null;
    mask?: string | null;
    type?: string | null;
    subtype?: string | null;
    currentBalance?: number | null;
    availableBalance?: number | null;
    limit?: number | null;
    isoCurrencyCode?: string | null;
    apr?: number | null;
    aprType?: string | null;
    aprBalanceSubjectToApr?: number | null;
    aprInterestChargeAmount?: number | null;
    minPaymentAmount?: number | null;
    lastStatementBalance?: number | null;
    nextPaymentDueDate?: string | null;
    lastStatementIssueDate?: string | null;
    lastPaymentAmount?: number | null;
    lastPaymentDate?: string | null;
    isOverdue?: boolean | null;
    extended?: {
        nickname?: string | null;
        cardProductId?: string | null;
    } | null;
}

export interface PlaidItem {
    id: string;
    itemId: string;
    institutionName: string | null;
    status: string;
    accounts: PlaidAccount[];
    familyMemberId: string;
    familyMember?: {
        id: string;
        name: string;
    };
}
