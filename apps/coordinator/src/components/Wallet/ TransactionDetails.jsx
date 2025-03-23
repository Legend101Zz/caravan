import React from "react";
import {
  Box,
  Typography,
  Button,
  Divider,
  Chip,
  Grid,
  Alert,
  AlertTitle,
} from "@mui/material";
import SpeedIcon from "@mui/icons-material/Speed";
import { satoshisToBitcoins } from "@caravan/bitcoin";
import { formatDistanceToNow } from "date-fns";

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "Pending";
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
};

const TransactionDetails = ({ transaction, network, onAccelerate }) => {
  if (!transaction) return null;

  const isPending = !transaction.status.confirmed;
  const feeRate = transaction.fee / transaction.size;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Transaction Details
      </Typography>

      <Box mb={3}>
        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
          Transaction ID
        </Typography>
        <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
          {transaction.txid}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Status
          </Typography>
          <Chip
            label={transaction.status.confirmed ? "Confirmed" : "Pending"}
            color={transaction.status.confirmed ? "success" : "warning"}
            size="small"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Time
          </Typography>
          <Typography variant="body2">
            {formatRelativeTime(transaction.status.blockTime)}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Size
          </Typography>
          <Typography variant="body2">{transaction.size} vBytes</Typography>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Fee
          </Typography>
          <Typography variant="body2">
            {transaction.fee.toLocaleString()} sats ({feeRate.toFixed(1)}{" "}
            sat/vB)
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {satoshisToBitcoins(transaction.fee.toString())} BTC
          </Typography>
        </Grid>
      </Grid>

      {isPending && (
        <>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Unconfirmed Transaction</AlertTitle>
            This transaction has been broadcast to the network but has not been
            confirmed yet. Current estimated confirmation time:{" "}
            <strong>~3 hours</strong>
          </Alert>

          <Box display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              startIcon={<SpeedIcon />}
              onClick={() => onAccelerate(transaction)}
            >
              Accelerate Transaction
            </Button>
          </Box>
        </>
      )}

      {transaction.status.confirmed && transaction.status.blockHeight && (
        <Box>
          <Typography variant="subtitle2" color="textSecondary" gutterBottom>
            Block Height
          </Typography>
          <Typography variant="body2">
            {transaction.status.blockHeight}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TransactionDetails;
