import { formatMoney } from "@/lib/money";

export default function BalanceFlow({ balance, currency, title = "Daily balance" }) {
  return <section className="card space-y-4">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 className="font-semibold">{title}</h3>
      <p className={`num text-sm font-bold ${balance.profit < 0 ? "text-danger" : "text-ok"}`}>
        {balance.profit < 0 ? "Loss" : "Profit"}: {formatMoney(Math.abs(balance.profit), currency)}
      </p>
    </div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-5">
      <div>
        <p className="text-xs text-muted">Opening balance</p>
        <strong className="num block mt-1">{formatMoney(balance.openingBalance, currency)}</strong>
      </div>
      <div>
        <p className="text-xs text-muted">Cost withdrawn</p>
        <strong className="num block mt-1 text-danger">−{formatMoney(balance.cost, currency)}</strong>
      </div>
      <div>
        <p className="text-xs text-muted">Balance after cost</p>
        <strong className={`num block mt-1 ${balance.balanceAfterCost < 0 ? "text-danger" : ""}`}>{formatMoney(balance.balanceAfterCost, currency)}</strong>
      </div>
      <div>
        <p className="text-xs text-muted">Revenue added</p>
        <strong className="num block mt-1 text-ok">+{formatMoney(balance.revenue, currency)}</strong>
      </div>
      <div>
        <p className="text-xs text-muted">Closing balance</p>
        <strong className={`num block mt-1 ${balance.closingBalance < 0 ? "text-danger" : "text-ok"}`}>{formatMoney(balance.closingBalance, currency)}</strong>
      </div>
    </div>
    <p className="text-xs text-muted">
      {formatMoney(balance.openingBalance, currency)} − {formatMoney(balance.cost, currency)} + {formatMoney(balance.revenue, currency)} = {formatMoney(balance.closingBalance, currency)}
    </p>
  </section>;
}
