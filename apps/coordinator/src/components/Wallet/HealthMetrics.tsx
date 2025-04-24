import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  PrivacyMetrics,
  WasteMetrics,
  AddressUtxos,
  Transaction,
} from "@caravan/health";
import { updateBlockchainClient } from "../../actions/clientActions";
import HealthDetailsModal from "./HealthDetailsModal";

interface HealthMetricsProps {
  inputs: Array<{
    txid: string;
    index: number;
    amount: number | string;
    amountSats?: number | any;
    confirmed: boolean;
    time?: number;
    multisig: {
      address: string;
    };
  }>;
  outputs: Array<{
    address: string;
    amount: number | string;
    amountSats?: number | any;
  }>;
  feeRate: number | string;
}

/**
 * HealthMetrics displays privacy and fee efficiency metrics for selected UTXOs
 * to help users make informed decisions during transaction creation.
 */
const HealthMetrics: React.FC<HealthMetricsProps> = ({
  inputs,
  outputs,
  feeRate,
}) => {
  // Get network and address type from Redux store
  const network = useSelector((state: any) => state.settings.network);
  const addressType = useSelector((state: any) => state.settings.addressType);

  // State for metrics and modal
  const [metrics, setMetrics] = useState({
    privacyScore: 0,
    wasteScore: 0,
    utxoMassFactor: 0,
    addressReuseFactor: 0,
    feesToAmountRatio: 0,
    estimatedConfirmationTime: "~10 min",
    overallHealth: "Calculating...",
  });
  const [loading, setLoading] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [feeRatePercentileHistory, setFeeRatePercentileHistory] = useState<
    any[]
  >([]);
  const [privacyMetric, setPrivacyMetric] = useState<PrivacyMetrics | null>(
    null,
  );
  const [wasteMetric, setWasteMetric] = useState<WasteMetrics | null>(null);

  // Function to fetch fee rate history
  const fetchFeeRateHistory = useCallback(async () => {
    try {
      // In a production environment, you'd fetch this from an API
      // For now, we'll use mock data
      const currentTime = Math.floor(Date.now() / 1000);
      const mockHistory = [
        {
          avgHeight: 700000,
          timestamp: currentTime - 3600, // 1 hour ago
          avgFee_0: 1,
          avgFee_10: 5,
          avgFee_25: 10,
          avgFee_50: 20,
          avgFee_75: 50,
          avgFee_90: 80,
          avgFee_100: 120,
        },
        {
          avgHeight: 699950,
          timestamp: currentTime - 7200, // 2 hours ago
          avgFee_0: 2,
          avgFee_10: 6,
          avgFee_25: 12,
          avgFee_50: 25,
          avgFee_75: 55,
          avgFee_90: 85,
          avgFee_100: 125,
        },
      ];

      setFeeRatePercentileHistory(mockHistory);
    } catch (error) {
      console.error("Failed to fetch fee rate history:", error);
      setFeeRatePercentileHistory([]);
    }
  }, []);

  // Format UTXOs for health metrics calculation
  const formatUtxosForHealthMetrics = useCallback(
    (inputsData: any[]): AddressUtxos => {
      const utxos: AddressUtxos = {};

      inputsData.forEach((input) => {
        const address = input.multisig.address;
        if (!utxos[address]) {
          utxos[address] = [];
        }

        utxos[address].push({
          txid: input.txid,
          vout: input.index,
          value: parseFloat(
            typeof input.amount === "string"
              ? input.amount
              : input.amount.toString(),
          ),
          status: {
            confirmed: input.confirmed,
            block_time: input.time || Math.floor(Date.now() / 1000),
          },
        });
      });

      return utxos;
    },
    [],
  );

  // Construct transactions object from inputs and outputs
  const constructTransactionFromInputsOutputs = useCallback(
    (
      inputsData: any[],
      outputsData: any[],
      feeRateValue: number | string,
    ): Transaction[] => {
      // Simple calculation of transaction size based on inputs and outputs
      const estimateTransactionSize = (
        inputCount: number,
        outputCount: number,
      ): number => {
        return 10 + inputCount * 150 + outputCount * 34;
      };

      const estimateTransactionWeight = (
        inputCount: number,
        outputCount: number,
      ): number => {
        return estimateTransactionSize(inputCount, outputCount) * 4;
      };

      const calculateTxFee = (ins: any[], outs: any[]): number => {
        const inputSum = ins.reduce((sum, input) => {
          const amount =
            typeof input.amount === "string"
              ? parseFloat(input.amount)
              : input.amount;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        const outputSum = outs.reduce((sum, output) => {
          const amount =
            typeof output.amount === "string"
              ? parseFloat(output.amount)
              : output.amount;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0);

        return Math.max(0, inputSum - outputSum);
      };

      // Create a simplified transaction object for health metrics
      const feeRateNum =
        typeof feeRateValue === "string"
          ? parseFloat(feeRateValue)
          : feeRateValue;

      const transaction: Transaction = {
        txid: "pending_tx",
        vin: inputsData.map((input) => ({
          prevTxId: input.txid,
          vout: input.index,
          sequence: 0,
        })),
        vout: outputsData.map((output) => ({
          scriptPubkeyAddress: output.address,
          scriptPubkeyHex: "",
          value: parseFloat(
            typeof output.amount === "string"
              ? output.amount
              : String(output.amount),
          ),
        })),
        size: estimateTransactionSize(inputsData.length, outputsData.length),
        weight: estimateTransactionWeight(
          inputsData.length,
          outputsData.length,
        ),
        fee: calculateTxFee(inputsData, outputsData),
        isSend: true,
        amount: outputsData.reduce((sum, output) => {
          const amount =
            typeof output.amount === "string"
              ? parseFloat(output.amount)
              : output.amount;
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0),
        block_time: Math.floor(Date.now() / 1000),
      };

      return [transaction];
    },
    [],
  );

  // Determine overall health rating based on scores
  const determineOverallHealth = useCallback(
    (privacyScore: number, wasteScore: number): string => {
      const averageScore = (privacyScore + (1 - wasteScore)) / 2;

      if (averageScore >= 0.8) return "Excellent";
      if (averageScore >= 0.6) return "Good";
      if (averageScore >= 0.4) return "Moderate";
      if (averageScore >= 0.2) return "Poor";
      return "Very Poor";
    },
    [],
  );

  // Estimate confirmation time based on fee rate
  const estimateConfirmationTime = useCallback(
    (feeRateValue: number | string): string => {
      const feeRateNum =
        typeof feeRateValue === "string"
          ? parseFloat(feeRateValue)
          : feeRateValue;

      if (feeRateNum >= 100) return "~10 min";
      if (feeRateNum >= 50) return "~30 min";
      if (feeRateNum >= 20) return "~1 hour";
      if (feeRateNum >= 10) return "~3 hours";
      if (feeRateNum >= 5) return "~1 day";
      return ">1 day";
    },
    [],
  );

  // Modal control functions
  const openDetailsModal = () => setDetailsModalOpen(true);
  const closeDetailsModal = () => setDetailsModalOpen(false);

  // Calculate metrics whenever inputs, outputs, or fee rate changes
  useEffect(() => {
    if (!inputs || inputs.length === 0) return;

    const calculateMetrics = async () => {
      setLoading(true);

      try {
        // Format the data for health metrics analysis
        const formattedUtxos = formatUtxosForHealthMetrics(inputs);
        const transactions = constructTransactionFromInputsOutputs(
          inputs,
          outputs,
          feeRate,
        );

        // Create instances of metric calculators
        const privacyMetricInstance = new PrivacyMetrics(
          transactions,
          formattedUtxos,
        );
        const wasteMetricInstance = new WasteMetrics(
          transactions,
          formattedUtxos,
        );

        setPrivacyMetric(privacyMetricInstance);
        setWasteMetric(wasteMetricInstance);

        // Calculate various metrics
        const privacyScore = privacyMetricInstance.getWalletPrivacyScore(
          addressType,
          network,
        );
        const utxoMassFactor = privacyMetricInstance.utxoMassFactor();
        const addressReuseFactor = privacyMetricInstance.addressReuseFactor();
        const wasteScore = wasteMetricInstance.weightedWasteScore(
          feeRatePercentileHistory,
        );
        const feesToAmountRatio = wasteMetricInstance.feesToAmountRatio();

        // Determine overall health based on scores
        const overallHealth = determineOverallHealth(privacyScore, wasteScore);

        // Update metrics state
        setMetrics({
          privacyScore: Math.round(privacyScore * 100),
          wasteScore: Math.round((1 - wasteScore) * 100), // Inverted so higher is better
          utxoMassFactor,
          addressReuseFactor,
          feesToAmountRatio,
          estimatedConfirmationTime: estimateConfirmationTime(feeRate),
          overallHealth,
        });
      } catch (error) {
        console.error("Error calculating health metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    calculateMetrics();
  }, [
    inputs,
    outputs,
    feeRate,
    addressType,
    network,
    feeRatePercentileHistory,
    formatUtxosForHealthMetrics,
    constructTransactionFromInputsOutputs,
    determineOverallHealth,
    estimateConfirmationTime,
  ]);

  // Fetch fee rate history on component mount
  useEffect(() => {
    fetchFeeRateHistory();
  }, [fetchFeeRateHistory]);

  // If no inputs, show a message
  if (!inputs || inputs.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Transaction Health
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Select UTXOs to view transaction health metrics
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={2} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Transaction Health
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Privacy Score</Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ width: "100%", mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={metrics.privacyScore}
                  color={
                    metrics.privacyScore >= 80
                      ? "success"
                      : metrics.privacyScore >= 50
                        ? "warning"
                        : "error"
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >{`${metrics.privacyScore}%`}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Fee Efficiency</Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Box sx={{ width: "100%", mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={metrics.wasteScore}
                  color={
                    metrics.wasteScore >= 80
                      ? "success"
                      : metrics.wasteScore >= 50
                        ? "warning"
                        : "error"
                  }
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Box>
              <Box sx={{ minWidth: 35 }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                >{`${metrics.wasteScore}%`}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Est. Confirmation</Typography>
            <Typography variant="body1">
              {metrics.estimatedConfirmationTime}
            </Typography>
          </Box>

          <Box>
            <Typography variant="subtitle1">Overall Health</Typography>
            <Typography
              variant="body1"
              color={
                metrics.overallHealth === "Excellent"
                  ? "success.main"
                  : metrics.overallHealth === "Good"
                    ? "success.main"
                    : metrics.overallHealth === "Moderate"
                      ? "warning.main"
                      : "error.main"
              }
              fontWeight="bold"
            >
              {metrics.overallHealth}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={openDetailsModal}
              disabled={loading}
            >
              View Detailed Health Analysis
            </Button>
          </Box>

          {detailsModalOpen && privacyMetric && wasteMetric && (
            <HealthDetailsModal
              open={detailsModalOpen}
              onClose={closeDetailsModal}
              metrics={{
                meanTopologyScore: privacyMetric.getMeanTopologyScore(),
                addressReuseFactor: privacyMetric.addressReuseFactor(),
                utxoSpreadFactor: privacyMetric.utxoSpreadFactor(),
                relativeFeesScore: wasteMetric.relativeFeesScore(
                  feeRatePercentileHistory,
                ),
                feesToAmountRatio: wasteMetric.feesToAmountRatio(),
                utxoMassFactor: privacyMetric.utxoMassFactor(),
              }}
            />
          )}
        </Box>
      )}
    </Paper>
  );
};

export default HealthMetrics;
