
import { PrismaClient } from '../generated/prisma';
import { calculatePaymentCycleStatus } from '../lib/payment-cycle';

const prisma = new PrismaClient();

async function main() {
    const accounts = await prisma.account.findMany({
        include: {
            plaidAccount: true,
            extended: true,
        },
    });

    console.log('Found', accounts.length, 'accounts');

    for (const account of accounts) {
        if (!account.plaidAccount) continue;

        const data = {
            lastStatementBalance: account.plaidAccount.lastStatementBalance,
            lastStatementIssueDate: account.plaidAccount.lastStatementIssueDate,
            currentBalance: account.plaidAccount.currentBalance,
            paymentMarkedPaidDate: account.extended?.paymentMarkedPaidDate ?? null,
        };

        const status = calculatePaymentCycleStatus(data);

        console.log('------------------------------------------------');
        console.log(`Account: ${account.name}`);
        console.log(`Current Balance: $${data.currentBalance}`);
        console.log(`Last Statement Bal: $${data.lastStatementBalance}`);
        console.log(`Last Statement Date: ${data.lastStatementIssueDate ? data.lastStatementIssueDate.toISOString().split('T')[0] : 'N/A'}`);
        console.log(`Marked Paid: ${data.paymentMarkedPaidDate ? data.paymentMarkedPaidDate.toISOString() : 'No'}`);
        console.log(`CALCULATED STATUS: ${status}`);

        // Debugging logic
        const now = new Date();
        let daysSinceIssue = Infinity;
        if (data.lastStatementIssueDate) {
            daysSinceIssue = (now.getTime() - new Date(data.lastStatementIssueDate).getTime()) / (1000 * 60 * 60 * 24);
        }
        console.log(`Days since statement: ${daysSinceIssue.toFixed(1)}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
