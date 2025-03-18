import React from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import SpeedIcon from "@mui/icons-material/Speed";
import CancelIcon from "@mui/icons-material/Cancel";
import ChildCareIcon from "@mui/icons-material/ChildCare";
import { FeeBumpStrategy } from "@caravan/fees";
import Copyable from "../Copyable";

const useStyles = makeStyles((theme) => ({
  section: {
    marginBottom: theme.spacing(3),
  },
  label: {
    fontWeight: 500,
    color: theme.palette.text.secondary,
  },
  value: {
    fontFamily: "monospace",
    wordBreak: "break-all",
  },
  card: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  divider: {
    margin: theme.spacing(2, 0),
  },
  recommendedChip: {
    marginLeft: theme.spacing(1),
  },
  infoItem: {
    marginBottom: theme.spacing(1),
  },
  feeEstimate: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
  },
}));

const TransactionDetails = ({
  transaction,
  analysis,
  onRBFSelected,
  onCPFPSelected,
}) => {
  const classes = useStyles();

  // Determine if a strategy is recommended
  const isRecommended = (strategy) => analysis.recommendedStrategy === strategy;

  // Format time since first seen
  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const txTime = new Date(timestamp);
    const diffMs = now - txTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} hours ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  return (
    <Box className={classes.section}>
      <Typography variant="h6" gutterBottom>
        Transaction Details
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs={12} className={classes.infoItem}>
                <Typography variant="subtitle2" className={classes.label}>
                  Transaction ID
                </Typography>
                <Copyable text={transaction.txid} showIcon>
                  <Typography className={classes.value}>
                    {transaction.txid}
                  </Typography>
                </Copyable>
              </Grid>

              <Grid item xs={12} md={4} className={classes.infoItem}>
                <Typography variant="subtitle2" className={classes.label}>
                  Broadcast Time
                </Typography>
                <Typography>
                  {transaction.time} ({formatTimeAgo(transaction.time)})
                </Typography>
              </Grid>

              <Grid item xs={12} md={4} className={classes.infoItem}>
                <Typography variant="subtitle2" className={classes.label}>
                  Size
                </Typography>
                <Typography>{analysis.vsize} vBytes</Typography>
              </Grid>

              <Grid item xs={12} md={4} className={classes.infoItem}>
                <Typography variant="subtitle2" className={classes.label}>
                  Fee
                </Typography>
                <Typography>
                  {analysis.fee} sats ({analysis.feeRate.toFixed(2)} sats/vB)
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Divider className={classes.divider} />

      <Typography variant="h6" gutterBottom>
        Acceleration Options
      </Typography>

      <Grid container spacing={2}>
        {analysis.canRBF && (
          <Grid item xs={12} md={6}>
            <Card className={classes.card} variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center">
                  <SpeedIcon color="primary" />
                  <Typography variant="h6" component="h3" ml={1}>
                    Replace-By-Fee (RBF)
                    {isRecommended(FeeBumpStrategy.RBF) && (
                      <Chip
                        label="Recommended"
                        color="success"
                        size="small"
                        className={classes.recommendedChip}
                      />
                    )}
                  </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" mt={1}>
                  Create a new transaction with a higher fee to replace the
                  current pending transaction.
                </Typography>

                <Box className={classes.feeEstimate}>
                  <Typography variant="body2">
                    <strong>Estimated Fee:</strong> {analysis.estimatedRBFFee}{" "}
                    sats
                  </Typography>
                </Box>

                <Typography variant="body2" mt={1}>
                  You can choose to speed up the transaction or cancel it
                  completely.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SpeedIcon />}
                  onClick={onRBFSelected}
                >
                  Speed Up
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={onRBFSelected}
                >
                  Cancel
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}

        {analysis.canCPFP && (
          <Grid item xs={12} md={6}>
            <Card className={classes.card} variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ChildCareIcon color="primary" />
                  <Typography variant="h6" component="h3" ml={1}>
                    Child-Pays-for-Parent (CPFP)
                    {isRecommended(FeeBumpStrategy.CPFP) && (
                      <Chip
                        label="Recommended"
                        color="success"
                        size="small"
                        className={classes.recommendedChip}
                      />
                    )}
                  </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" mt={1}>
                  Create a new transaction that spends an output from this
                  transaction with a higher fee.
                </Typography>

                <Box className={classes.feeEstimate}>
                  <Typography variant="body2">
                    <strong>Estimated Fee:</strong> {analysis.estimatedCPFPFee}{" "}
                    sats
                  </Typography>
                </Box>

                <Typography variant="body2" mt={1}>
                  This method works even when RBF is not signaled, as long as
                  you have a spendable output.
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<ChildCareIcon />}
                  onClick={onCPFPSelected}
                >
                  Create Child Transaction
                </Button>
              </CardActions>
            </Card>
          </Grid>
        )}

        {!analysis.canRBF && !analysis.canCPFP && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body1" color="error">
                This transaction cannot be accelerated. Either:
              </Typography>
              <ul>
                <li>It doesn't signal RBF (Replace-By-Fee)</li>
                <li>It doesn't have a spendable change output for CPFP</li>
                <li>You don't control any of the transaction's inputs</li>
              </ul>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

TransactionDetails.propTypes = {
  transaction: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
  }).isRequired,
  analysis: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    vsize: PropTypes.number.isRequired,
    fee: PropTypes.string.isRequired,
    feeRate: PropTypes.number.isRequired,
    canRBF: PropTypes.bool.isRequired,
    canCPFP: PropTypes.bool.isRequired,
    recommendedStrategy: PropTypes.string.isRequired,
    estimatedRBFFee: PropTypes.string,
    estimatedCPFPFee: PropTypes.string,
  }).isRequired,
  onRBFSelected: PropTypes.func.isRequired,
  onCPFPSelected: PropTypes.func.isRequired,
};

export default TransactionDetails;
