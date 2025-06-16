import { CircularProgress, Divider, Fab, List, ListItem, ListItemText, Typography } from "@mui/material";
import type { MetaFunction } from "@remix-run/cloudflare";
import { useHono } from "~/fetcher";
import RefreshIcon from "@mui/icons-material/Refresh";

export const meta: MetaFunction = () => {
  return [
    { title: "Card Notifier" },
  ];
};

/**
 * Returns the week of the year for a given date.
 * It follows the ISO. Monday is the first day of the week.
 * If the first day of the year is a Friday, Saturday, or Sunday, it will be considered
 *  as part of the first week of the current year.
 * @param weekNumber
 */
const getWeekOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + start.getDay() + 1) / 7);
  return weekNumber;
};

export default function Index() {
  const { data, error, isLoading, mutate } = useHono(
    "/api/transactions",
    (c) => c.api.transactions.$get({ query: undefined })
  );
  type Transactions = Exclude<typeof data, undefined>;

  const transactions =
    (data || []).reduce((acc, transaction) => {
      const date = new Date(transaction.purchasedAt);
      const weekOfYear = `${date.getFullYear()}-${getWeekOfYear(date)}`;
      const dateKey = date.toISOString().split("T")[0];
      if (!acc[weekOfYear]) {
        acc[weekOfYear] = {
          total: 0,
          transactions: {},
        };
      }
      if (!acc[weekOfYear].transactions[dateKey]) {
        acc[weekOfYear].transactions[dateKey] = {
          total: 0,
          transactions: [],
        };
      }
      acc[weekOfYear].total += transaction.amount;
      acc[weekOfYear].transactions[dateKey].total += transaction.amount;
      acc[weekOfYear].transactions[dateKey].transactions.push(transaction);
      return acc;
    }, {} as {
      [weekOfYear: string]: {
        total: number;
        transactions: {
          [date: string]: {
            total: number;
            transactions: Transactions;
          },
        },
      },
    });

  if (isLoading) {
    return <CircularProgress sx={{ display: "block", margin: "auto", mt: 4 }} />;
  }
  const fab = (
    <Fab
      sx={(theme) => ({ position: 'fixed', bottom: theme.spacing(2), right: theme.spacing(2) })}
      aria-label="refresh"
      onClick={() => mutate()}
    >
      <RefreshIcon />
    </Fab>
  );
  if (error) {
    return (
      <>
        <Typography color="error" sx={{ textAlign: "center", mt: 4 }}>{error.message}</Typography>
        {fab}
      </>
    );
  }
  if (Object.keys(transactions).length === 0) {
    return (
      <>
        <Typography sx={{ textAlign: "center", mt: 4 }}>No transactions found.</Typography>
        {fab}
      </>
    );
  }
  return (
    <>
      <List sx={{ width: "100%", maxWidth: 600, ml: "auto", mr: "auto" }}>
        {Object.entries(transactions || {})
          .flatMap(([week, weekInfo]) => (
            <>
              <ListItem key={week} sx={{ bgcolor: "background.paper" }}>
                <ListItemText primary={week} />
                <ListItemText primary={`${weekInfo.total}円`} sx={{ textAlign: 'end' }} />
              </ListItem>
              {Object.entries(weekInfo.transactions).map(([date, dateInfo], index) =>
                <>
                  {index > 0 && <Divider key={`divider-${week}-${date}`} />}
                  <ListItem key={date}>
                    <ListItemText primary={date} />
                    <ListItemText primary={`${dateInfo.total}円`} sx={{ textAlign: 'end' }} />
                  </ListItem>
                  {dateInfo.transactions.map((transaction) => (
                    <ListItem key={transaction.id}>
                      <ListItemText
                        primary={transaction.destination}
                        secondary={
                          <>
                            <Typography component="span" variant="body2" color="text.primary">
                              {transaction.cardName}
                            </Typography>
                            <Typography component="span" variant="body2" sx={{ textWrap: "nowrap", ml: 1 }}>
                              {new Date(transaction.purchasedAt).toLocaleString()}
                            </Typography>
                          </>
                        }
                      />
                      <ListItemText sx={{ textAlign: "end" }}>
                        {transaction.amountCurrency} {transaction.amount}
                      </ListItemText>
                    </ListItem>
                  ))}
                </>
              )}
            </>
          ))
        }
      </List>
      {fab}
    </>
  );
}
