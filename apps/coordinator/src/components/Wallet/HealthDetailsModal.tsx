import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
} from "@mui/material";

interface HealthDetailsModalProps {
  open: boolean;
  onClose: () => void;
  metrics: {
    meanTopologyScore: number;
    addressReuseFactor: number;
    utxoSpreadFactor: number;
    relativeFeesScore: number;
    feesToAmountRatio: number;
    utxoMassFactor: number;
  };
}

/**
 * HealthDetailsModal displays detailed health metrics in a modal dialog
 */
const HealthDetailsModal: React.FC<HealthDetailsModalProps> = ({
  open,
  onClose,
  metrics,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5">Transaction Health Details</Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Privacy Metrics
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Topology Score</TableCell>
                <TableCell>{metrics.meanTopologyScore.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ width: "100px", mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.meanTopologyScore * 100}
                        color={
                          metrics.meanTopologyScore >= 0.6
                            ? "success"
                            : metrics.meanTopologyScore >= 0.3
                              ? "warning"
                              : "error"
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${(metrics.meanTopologyScore * 100).toFixed(0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  Evaluates privacy based on transaction input/output structure
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Address Reuse</TableCell>
                <TableCell>{metrics.addressReuseFactor.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ width: "100px", mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(1 - metrics.addressReuseFactor) * 100}
                        color={
                          metrics.addressReuseFactor <= 0.2
                            ? "success"
                            : metrics.addressReuseFactor <= 0.6
                              ? "warning"
                              : "error"
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${((1 - metrics.addressReuseFactor) * 100).toFixed(0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  Measures amount held by reused addresses vs. total
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>UTXO Spread</TableCell>
                <TableCell>{metrics.utxoSpreadFactor.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ width: "100px", mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.utxoSpreadFactor * 100}
                        color={
                          metrics.utxoSpreadFactor >= 0.8
                            ? "success"
                            : metrics.utxoSpreadFactor >= 0.4
                              ? "warning"
                              : "error"
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${(metrics.utxoSpreadFactor * 100).toFixed(0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  Evaluates dispersion of UTXO values, higher is better
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Fee Efficiency Metrics
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Score</TableCell>
                <TableCell>Description</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Relative Fee Score</TableCell>
                <TableCell>{metrics.relativeFeesScore.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ width: "100px", mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={metrics.relativeFeesScore * 100}
                        color={
                          metrics.relativeFeesScore >= 0.8
                            ? "success"
                            : metrics.relativeFeesScore >= 0.4
                              ? "warning"
                              : "error"
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${(metrics.relativeFeesScore * 100).toFixed(0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  Compares transaction fees to others in the same block
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>Fee To Amount Ratio</TableCell>
                <TableCell>
                  {(metrics.feesToAmountRatio * 100).toFixed(4)}%
                </TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ width: "100px", mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(1 - metrics.feesToAmountRatio) * 100}
                        color={
                          metrics.feesToAmountRatio <= 0.001
                            ? "success"
                            : metrics.feesToAmountRatio <= 0.01
                              ? "warning"
                              : "error"
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${((1 - metrics.feesToAmountRatio) * 100).toFixed(0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  Percentage of transaction amount paid as fees
                </TableCell>
              </TableRow>

              <TableRow>
                <TableCell>UTXO Mass Factor</TableCell>
                <TableCell>{metrics.utxoMassFactor.toFixed(2)}</TableCell>
                <TableCell>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Box sx={{ width: "100px", mr: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={(1 - metrics.utxoMassFactor) * 100}
                        color={
                          metrics.utxoMassFactor <= 0.25
                            ? "success"
                            : metrics.utxoMassFactor <= 0.75
                              ? "warning"
                              : "error"
                        }
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {`${((1 - metrics.utxoMassFactor) * 100).toFixed(0)}%`}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  Evaluates UTXO set size; smaller values are better
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Health Recommendations
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Typography variant="body1" paragraph>
            Based on the analysis of your transaction, here are some
            recommendations:
          </Typography>

          <Box component="ul" sx={{ pl: 2 }}>
            {metrics.addressReuseFactor > 0.2 && (
              <Typography component="li" variant="body1">
                Consider avoiding address reuse to improve privacy.
              </Typography>
            )}

            {metrics.meanTopologyScore < 0.5 && (
              <Typography component="li" variant="body1">
                Transaction structure reveals patterns. Try varying input/output
                counts in future transactions.
              </Typography>
            )}

            {metrics.feesToAmountRatio > 0.01 && (
              <Typography component="li" variant="body1">
                Fee is high relative to transaction amount. Consider batching
                transactions or waiting for lower network fees.
              </Typography>
            )}

            {metrics.utxoMassFactor > 0.5 && (
              <Typography component="li" variant="body1">
                Your UTXO set is relatively small. Consider breaking up large
                UTXOs to increase future spending flexibility.
              </Typography>
            )}

            {metrics.utxoSpreadFactor < 0.4 && (
              <Typography component="li" variant="body1">
                Low UTXO value dispersion. Try to maintain a mix of different
                value UTXOs for better privacy.
              </Typography>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HealthDetailsModal;
