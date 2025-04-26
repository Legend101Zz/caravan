import React, { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  Box,
  Button,
  Tooltip,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Paper,
  IconButton,
  Divider,
  LinearProgress,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Search as SearchIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { PrivacyMetrics, WasteMetrics } from "@caravan/health";
import {
  useFetchTransactions,
  useWalletAddresses,
} from "./TransactionsTab/hooks";

/**
 *  UTXOOptimizer
 *
 * A comprehensive UTXO management interface that provides:
 * 1. Health metrics for each UTXO based on privacy and efficiency
 * 2. Smart UTXO categorization (Ideal, Good, Hold, Avoid)
 * 3. Manual and automatic selection modes
 * 4. Transaction health metrics
 * 5. Visual indicators for privacy and fee efficiency
 */
const UTXOOptimizer = ({
  availableUtxos,
  targetAmount,
  feeRate,
  onOptimize,
}) => {
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUTXOs, setSelectedUTXOs] = useState([]);
  const [utxoHealthMetrics, setUtxoHealthMetrics] = useState({});
  const [transactionHealth, setTransactionHealth] = useState({
    privacyScore: 0,
    feeEfficiency: 0,
    overallHealth: "Pending",
  });
  const [autoMode, setAutoMode] = useState(true);

  // Get network and address type from Redux store
  const network = useSelector((state) => state.settings.network);
  const addressType = useSelector((state) => state.settings.addressType);

  // Fetch transaction data using the TransactionsTab hook
  const {
    transactions,
    isLoading: txDataLoading,
    fetchTransactions,
  } = useFetchTransactions();

  // Get all wallet addresses using the TransactionsTab hook
  const walletAddresses = useWalletAddresses();

  // Ensure transactions are fetched when component mounts
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Calculate health metrics for all UTXOs
  useEffect(() => {
    if (availableUtxos.length === 0 || txDataLoading || !transactions) return;

    const calculateUtxoHealth = async () => {
      const mappedTransactions = (transactions || []).map((tx) => ({
        ...tx,
        isSend: tx.isReceived !== undefined ? !tx.isReceived : false,
        amount: tx.valueToWallet
          ? Math.abs(tx.valueToWallet) + (tx.fee || 0)
          : 0,
        block_time: tx.status?.blockTime || 0,
      }));

      const metrics = {};

      // Calculate metrics for each UTXO individually
      for (const utxo of availableUtxos) {
        const utxoAddress = utxo.multisig.address;
        const utxoAsFormattedObject = {
          [utxoAddress]: [
            {
              txid: utxo.txid,
              vout: utxo.index,
              value: parseFloat(
                typeof utxo.amount === "string"
                  ? utxo.amount
                  : utxo.amount.toString(),
              ),
              status: {
                confirmed: utxo.confirmed,
                block_time: utxo.time || Math.floor(Date.now() / 1000),
              },
            },
          ],
        };

        // Calculate spend vs hold recommendation using waste metrics
        const wasteMetric = new WasteMetrics(
          mappedTransactions,
          utxoAsFormattedObject,
        );

        // Simple calculation for demonstration purposes - in production you'd use real fee estimates
        const estimatedLongTermFeeRate = parseFloat(feeRate) * 1.5; // Assume long-term fees might be 1.5x current
        const utxoAmount = parseFloat(
          typeof utxo.amount === "string"
            ? utxo.amount
            : utxo.amount.toString(),
        );
        const inputWeight = 150; // Simplified weight estimate

        const spendWaste = wasteMetric.spendWasteAmount(
          inputWeight,
          parseFloat(feeRate),
          utxoAmount * 100000000, // Convert to sats
          0, // Assume not spending to calculate pure SWA
          estimatedLongTermFeeRate,
        );

        // Calculate privacy impact metrics
        const privacyMetric = new PrivacyMetrics(
          mappedTransactions,
          utxoAsFormattedObject,
        );
        const privacyScore = privacyMetric.getWalletPrivacyScore(
          addressType,
          network,
        );

        // Calculate overall health score (0-100)
        const normalizedPrivacyScore = Math.min(
          Math.max(privacyScore * 100, 0),
          100,
        );

        // Determine recommendation based on metrics
        let recommendation;
        let healthScore;

        if (spendWaste > 1000) {
          // Positive waste means waiting to spend is better
          recommendation = "Hold";
          healthScore = Math.round(35 + normalizedPrivacyScore * 0.3);
        } else if (spendWaste < -1000) {
          // Negative waste means spending now is better
          recommendation = "Ideal";
          healthScore = Math.round(80 + normalizedPrivacyScore * 0.2);
        } else {
          recommendation = "Good";
          healthScore = Math.round(60 + normalizedPrivacyScore * 0.2);
        }

        // If UTXO is very small, it might be dust-like
        if (utxoAmount < 0.001) {
          recommendation = "Avoid";
          healthScore = Math.round(20 + normalizedPrivacyScore * 0.1);
        }

        metrics[utxo.txid + ":" + utxo.index] = {
          healthScore,
          recommendation,
          privacyImpact: normalizedPrivacyScore,
          spendWaste,
        };
      }

      setUtxoHealthMetrics(metrics);
    };

    calculateUtxoHealth();
  }, [
    availableUtxos,
    transactions,
    txDataLoading,
    addressType,
    network,
    feeRate,
  ]);

  // Update transaction health when selected UTXOs change
  useEffect(() => {
    if (selectedUTXOs.length === 0) {
      setTransactionHealth({
        privacyScore: 0,
        feeEfficiency: 0,
        overallHealth: "Pending",
      });
      return;
    }

    // Calculate aggregate health metrics for selected UTXOs
    const privacyScores = selectedUTXOs.map((utxo) => {
      const metrics = utxoHealthMetrics[utxo.txid + ":" + utxo.index];
      return metrics ? metrics.privacyImpact : 0;
    });

    const avgPrivacyScore =
      privacyScores.reduce((sum, score) => sum + score, 0) /
      privacyScores.length;

    // Calculate fee efficiency based on total amount vs target
    const totalAmount = selectedUTXOs.reduce((sum, utxo) => {
      const amount =
        typeof utxo.amount === "string" ? parseFloat(utxo.amount) : utxo.amount;
      return sum + amount;
    }, 0);

    const targetAmountValue =
      typeof targetAmount === "string"
        ? parseFloat(targetAmount)
        : targetAmount;
    const changeRatio = Math.max(
      0,
      (totalAmount - targetAmountValue) / totalAmount,
    );
    const feeEfficiency = Math.round((1 - changeRatio) * 100);

    // Calculate overall health
    let overallHealth;
    const overallScore = avgPrivacyScore * 0.6 + feeEfficiency * 0.4;

    if (overallScore >= 85) overallHealth = "Excellent";
    else if (overallScore >= 70) overallHealth = "Good";
    else if (overallScore >= 50) overallHealth = "Average";
    else overallHealth = "Poor";

    setTransactionHealth({
      privacyScore: Math.round(avgPrivacyScore),
      feeEfficiency,
      overallHealth,
    });
  }, [selectedUTXOs, utxoHealthMetrics, targetAmount]);

  // Format UTXOs for health metrics calculation
  const formatUtxosForHealthMetrics = useCallback((utxos) => {
    const formattedUtxos = {};

    utxos.forEach((utxo) => {
      const address = utxo.multisig.address;
      if (!formattedUtxos[address]) {
        formattedUtxos[address] = [];
      }

      formattedUtxos[address].push({
        txid: utxo.txid,
        vout: utxo.index,
        value: parseFloat(
          typeof utxo.amount === "string"
            ? utxo.amount
            : utxo.amount.toString(),
        ),
        status: {
          confirmed: utxo.confirmed,
          block_time: utxo.time || Math.floor(Date.now() / 1000),
        },
      });
    });

    return formattedUtxos;
  }, []);

  // Generate different possible UTXO combinations that meet the target amount
  const generateCandidateSets = useCallback(
    (utxos) => {
      // Skip if no UTXOs are available
      if (utxos.length === 0) return [];

      // Convert target amount to number
      const targetAmountValue =
        typeof targetAmount === "string"
          ? parseFloat(targetAmount)
          : targetAmount;
      if (isNaN(targetAmountValue) || targetAmountValue <= 0) return [];

      // Convert fee rate to number
      const feeRateValue =
        typeof feeRate === "string" ? parseFloat(feeRate) : feeRate;
      if (isNaN(feeRateValue) || feeRateValue <= 0) return [];

      // Function to select UTXOs to meet target amount
      const selectUTXOsToMeetTarget = (sortedUtxos) => {
        let sum = 0;
        const selected = [];
        // Calculate fee per input based on estimated input size (150 bytes) and fee rate
        const estimatedFeePerInput = (150 * feeRateValue) / 100000000; // Convert to BTC

        for (const utxo of sortedUtxos) {
          const amount =
            typeof utxo.amount === "string"
              ? parseFloat(utxo.amount)
              : utxo.amount;
          if (isNaN(amount)) continue;

          // Check if we've reached our target amount plus estimated fees
          if (
            sum >=
            targetAmountValue + selected.length * estimatedFeePerInput
          ) {
            break;
          }

          selected.push(utxo);
          sum += amount;
        }

        // If we can't meet the target, return empty set
        if (sum < targetAmountValue + selected.length * estimatedFeePerInput) {
          return [];
        }

        return selected;
      };

      // Generate multiple candidate sets using different selection strategies
      const sets = [];

      // Strategy 1: Prioritize "Ideal" UTXOs first based on health metrics
      const idealFirst = [...utxos].sort((a, b) => {
        const aMetrics = utxoHealthMetrics[a.txid + ":" + a.index];
        const bMetrics = utxoHealthMetrics[b.txid + ":" + b.index];

        if (!aMetrics || !bMetrics) return 0;

        // Prioritize recommended UTXOs
        if (
          aMetrics.recommendation === "Ideal" &&
          bMetrics.recommendation !== "Ideal"
        )
          return -1;
        if (
          bMetrics.recommendation === "Ideal" &&
          aMetrics.recommendation !== "Ideal"
        )
          return 1;

        // Then by health score
        return bMetrics.healthScore - aMetrics.healthScore;
      });
      sets.push(selectUTXOsToMeetTarget(idealFirst));

      // Strategy 2: Minimize change (closest to target amount)
      const closest = [...utxos].sort((a, b) => {
        const amountA =
          typeof a.amount === "string" ? parseFloat(a.amount) : a.amount;
        const amountB =
          typeof b.amount === "string" ? parseFloat(b.amount) : b.amount;
        return (
          Math.abs(amountA - targetAmountValue) -
          Math.abs(amountB - targetAmountValue)
        );
      });
      sets.push(selectUTXOsToMeetTarget(closest));

      // Strategy 3: Address dispersal (prioritize different addresses)
      const addressMap = new Map();
      utxos.forEach((utxo) => {
        const addr = utxo.multisig.address;
        if (!addressMap.has(addr)) {
          addressMap.set(addr, []);
        }
        addressMap.get(addr).push(utxo);
      });

      // Flatten but prioritize one from each address first
      const addressDispersed = [];
      let remaining = [];

      // First take one from each address
      for (const [_, addrUtxos] of addressMap.entries()) {
        if (addrUtxos.length > 0) {
          // Sort by health score within each address
          const sorted = [...addrUtxos].sort((a, b) => {
            const aMetrics = utxoHealthMetrics[a.txid + ":" + a.index];
            const bMetrics = utxoHealthMetrics[b.txid + ":" + b.index];

            if (!aMetrics || !bMetrics) return 0;
            return bMetrics.healthScore - aMetrics.healthScore;
          });
          addressDispersed.push(sorted[0]);
          remaining = remaining.concat(sorted.slice(1));
        }
      }

      // Sort remaining by health score
      remaining.sort((a, b) => {
        const aMetrics = utxoHealthMetrics[a.txid + ":" + a.index];
        const bMetrics = utxoHealthMetrics[b.txid + ":" + b.index];

        if (!aMetrics || !bMetrics) return 0;
        return bMetrics.healthScore - aMetrics.healthScore;
      });

      // Combine the address-dispersed UTXOs with remaining sorted by size
      const dispersalStrategy = addressDispersed.concat(remaining);
      sets.push(selectUTXOsToMeetTarget(dispersalStrategy));

      return sets.filter((set) => set.length > 0);
    },
    [targetAmount, feeRate, utxoHealthMetrics],
  );

  // Score a candidate UTXO set using wallet transaction history
  const scoreUTXOSet = useCallback(
    async (utxoSet) => {
      // Skip empty sets
      if (utxoSet.length === 0) return -Infinity;

      // Format UTXOs for metrics calculation
      const formattedUtxos = formatUtxosForHealthMetrics(utxoSet);

      // Use real transactions from the wallet but map to the format expected by the health package
      const allTransactions = (transactions || []).map((tx) => ({
        ...tx,
        // Map isReceived to isSend (opposite values)
        isSend: tx.isReceived !== undefined ? !tx.isReceived : false,
        // Map valueToWallet to amount (using absolute value + fees for consistency)
        amount: tx.valueToWallet
          ? Math.abs(tx.valueToWallet) + (tx.fee || 0)
          : 0,
        // Map status.blockTime to block_time
        block_time: tx.status?.blockTime || 0,
      }));

      // Calculate metrics using real wallet transaction history
      const privacyMetric = new PrivacyMetrics(allTransactions, formattedUtxos);
      const wasteMetric = new WasteMetrics(allTransactions, formattedUtxos);

      // Get holistic wallet privacy score based on actual tx history and address usage
      const privacyScore = privacyMetric.getWalletPrivacyScore(
        addressType,
        network,
      );

      // Get UTXO mass factor - considers how this selection impacts the UTXO set
      const utxoMassFactor = privacyMetric.utxoMassFactor();

      // Get UTXO value dispersion factor - analyzes UTXO denominations for traceability
      const utxoDispersionFactor = privacyMetric.utxoValueDispersionFactor();

      // Calculate waste metrics with empty fee percentiles for now
      // In production, you would fetch historical fee data for better scoring
      const wasteScore = wasteMetric.weightedWasteScore([]);

      // Combine scores based on wallet priorities
      // Higher weight for privacy (0.6) vs efficiency (0.4)
      const combinedScore =
        privacyScore * 0.5 +
        utxoDispersionFactor * 0.1 +
        (1 - wasteScore) * 0.4;

      return combinedScore;
    },
    [formatUtxosForHealthMetrics, transactions, network, addressType],
  );

  // Core optimization algorithm
  const findOptimalUTXOCombination = useCallback(async () => {
    // Generate candidate sets of UTXOs
    const candidateSets = generateCandidateSets(availableUtxos);

    // If no valid sets were found, return empty array
    if (candidateSets.length === 0) {
      return [];
    }

    // Score each candidate set using real transaction data
    let bestScore = -Infinity;
    let bestSet = [];
    let bestSetInfo = null;

    console.log(`Evaluating ${candidateSets.length} candidate UTXO sets`);

    for (const candidateSet of candidateSets) {
      try {
        const score = await scoreUTXOSet(candidateSet);

        // Track the total amount in the candidate set
        const totalAmount = candidateSet.reduce((sum, utxo) => {
          const amount =
            typeof utxo.amount === "string"
              ? parseFloat(utxo.amount)
              : utxo.amount;
          return sum + amount;
        }, 0);

        // Log scoring info for transparency
        console.log(
          `UTXO set score: ${score.toFixed(4)}, UTXOs: ${candidateSet.length}, Total: ${totalAmount.toFixed(8)} BTC`,
        );

        if (score > bestScore) {
          bestScore = score;
          bestSet = candidateSet;
          bestSetInfo = {
            score,
            count: candidateSet.length,
            total: totalAmount,
          };
        }
      } catch (error) {
        console.error("Error scoring UTXO set:", error);
      }
    }

    if (bestSetInfo) {
      console.log(
        `Selected optimal UTXO set: Score ${bestSetInfo.score.toFixed(4)}, UTXOs: ${bestSetInfo.count}, Total: ${bestSetInfo.total.toFixed(8)} BTC`,
      );
    }

    return bestSet;
  }, [generateCandidateSets, scoreUTXOSet, availableUtxos]);

  // Handle the auto-optimize button click
  const autoOptimizeUTXOs = async () => {
    setLoading(true);

    try {
      const selectedUTXOs = await findOptimalUTXOCombination();
      setSelectedUTXOs(selectedUTXOs);
      onOptimize(selectedUTXOs);
    } catch (error) {
      console.error("Error optimizing UTXOs:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle toggling a UTXO selection
  const toggleUtxoSelection = (utxo) => {
    setSelectedUTXOs((prevSelected) => {
      const isSelected = prevSelected.some(
        (u) => u.txid === utxo.txid && u.index === utxo.index,
      );

      if (isSelected) {
        return prevSelected.filter(
          (u) => !(u.txid === utxo.txid && u.index === utxo.index),
        );
      } else {
        return [...prevSelected, utxo];
      }
    });
  };

  // Handle manual submit
  const handleManualSubmit = () => {
    if (selectedUTXOs.length > 0) {
      onOptimize(selectedUTXOs);
    }
  };

  // Filter utxos based on search
  const filteredUtxos = availableUtxos.filter((utxo) => {
    const searchLower = searchTerm.toLowerCase();
    const utxoId = `${utxo.txid}:${utxo.index}`;
    const metrics = utxoHealthMetrics[utxoId];

    // Search by txid, address, or recommendation
    return (
      utxo.txid.toLowerCase().includes(searchLower) ||
      utxo.multisig.address.toLowerCase().includes(searchLower) ||
      (metrics && metrics.recommendation.toLowerCase().includes(searchLower))
    );
  });

  // Get health chip color based on score
  const getHealthColor = (score) => {
    if (score >= 85) return "success";
    if (score >= 65) return "primary";
    if (score >= 40) return "warning";
    return "error";
  };

  // Get chip color based on recommendation
  const getRecommendationColor = (recommendation) => {
    switch (recommendation) {
      case "Ideal":
        return "success";
      case "Good":
        return "primary";
      case "Hold":
        return "warning";
      case "Avoid":
        return "error";
      default:
        return "default";
    }
  };

  // Get recommendation icon
  const getRecommendationIcon = (recommendation) => {
    switch (recommendation) {
      case "Ideal":
        return <CheckCircleIcon fontSize="small" />;
      case "Good":
        return <CheckCircleIcon fontSize="small" />;
      case "Hold":
        return <WarningIcon fontSize="small" />;
      case "Avoid":
        return <CancelIcon fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ mt: 3, mb: 3 }}>
      <Grid container spacing={3}>
        {/* Left panel - Available UTXOs */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography variant="h6">Available UTXOs</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!autoMode}
                        onChange={() => setAutoMode(!autoMode)}
                        name="modeSwitch"
                      />
                    }
                    label="Manual"
                  />
                </Box>
              }
            />
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <TextField
                  placeholder="Search UTXOs..."
                  fullWidth
                  variant="outlined"
                  size="small"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="clear search"
                          onClick={() => setSearchTerm("")}
                          edge="end"
                          size="small"
                        >
                          <CloseIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ maxHeight: 400 }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Path</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell align="center">Health</TableCell>
                      <TableCell align="center">Recommendation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredUtxos.map((utxo) => {
                      const utxoId = `${utxo.txid}:${utxo.index}`;
                      const metrics = utxoHealthMetrics[utxoId] || {
                        healthScore: 0,
                        recommendation: "Pending",
                        privacyImpact: 0,
                        spendWaste: 0,
                      };

                      const isSelected = selectedUTXOs.some(
                        (u) => u.txid === utxo.txid && u.index === utxo.index,
                      );

                      const amount =
                        typeof utxo.amount === "string"
                          ? parseFloat(utxo.amount)
                          : utxo.amount;

                      return (
                        <TableRow
                          key={utxoId}
                          hover
                          selected={isSelected}
                          onClick={() => !autoMode && toggleUtxoSelection(utxo)}
                          sx={{
                            cursor: !autoMode ? "pointer" : "default",
                            bgcolor: isSelected
                              ? "rgba(25, 118, 210, 0.08)"
                              : "inherit",
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontFamily: "monospace" }}
                            >
                              {utxo.bip32Path}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              noWrap
                            >
                              {utxo.txid.substring(0, 10)}...
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {amount.toFixed(8)} BTC
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {utxo.confirmed ? "Confirmed" : "Pending"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip
                              title={
                                <Box>
                                  <Typography variant="caption">
                                    Privacy Impact:{" "}
                                    {metrics.privacyImpact.toFixed(0)}%
                                  </Typography>
                                  <br />
                                  <Typography variant="caption">
                                    Spend Waste: {metrics.spendWaste.toFixed(0)}{" "}
                                    sats
                                  </Typography>
                                </Box>
                              }
                            >
                              <Chip
                                size="small"
                                label={`${metrics.healthScore}%`}
                                color={getHealthColor(metrics.healthScore)}
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              size="small"
                              label={metrics.recommendation}
                              color={getRecommendationColor(
                                metrics.recommendation,
                              )}
                              icon={getRecommendationIcon(
                                metrics.recommendation,
                              )}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredUtxos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            sx={{ py: 2 }}
                          >
                            No UTXOs found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right panel - Transaction Health */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title={<Typography variant="h6">Transaction Health</Typography>}
            />
            <CardContent>
              <Box
                sx={{
                  border: "1px dashed #ccc",
                  borderRadius: 1,
                  p: 3,
                  mb: 3,
                  minHeight: 150,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "#f8f9fa",
                }}
              >
                {selectedUTXOs.length > 0 ? (
                  <Box>
                    <Typography sx={{ mb: 1 }} align="center">
                      Selected {selectedUTXOs.length} UTXOs with total amount:
                    </Typography>
                    <Typography
                      variant="h5"
                      align="center"
                      sx={{ fontWeight: "bold" }}
                    >
                      {selectedUTXOs
                        .reduce((sum, utxo) => {
                          const amount =
                            typeof utxo.amount === "string"
                              ? parseFloat(utxo.amount)
                              : utxo.amount;
                          return sum + amount;
                        }, 0)
                        .toFixed(8)}{" "}
                      BTC
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 1,
                        mt: 2,
                      }}
                    >
                      {!autoMode &&
                        selectedUTXOs.map((utxo) => {
                          const utxoId = `${utxo.txid}:${utxo.index}`;
                          const metrics = utxoHealthMetrics[utxoId] || {
                            healthScore: 0,
                            recommendation: "Pending",
                          };

                          return (
                            <Chip
                              key={utxoId}
                              size="small"
                              label={`${utxo.bip32Path}: ${(typeof utxo.amount ===
                              "string"
                                ? parseFloat(utxo.amount)
                                : utxo.amount
                              ).toFixed(4)} BTC`}
                              color={getHealthColor(metrics.healthScore)}
                              onDelete={() => toggleUtxoSelection(utxo)}
                              deleteIcon={<CloseIcon />}
                            />
                          );
                        })}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography color="textSecondary" align="center">
                      {autoMode
                        ? "Click 'Auto-Optimize' to select the optimal UTXO set"
                        : "Select UTXOs from the left panel to include them in the transaction"}
                    </Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Privacy Score
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ flexGrow: 1, mr: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={transactionHealth.privacyScore}
                      color={getHealthColor(transactionHealth.privacyScore)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {transactionHealth.privacyScore}%
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Fee Efficiency
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ flexGrow: 1, mr: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={transactionHealth.feeEfficiency}
                      color={getHealthColor(transactionHealth.feeEfficiency)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {transactionHealth.feeEfficiency}%
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Est. Confirmation
                </Typography>
                <Typography variant="body1">
                  {isNaN(parseFloat(feeRate))
                    ? "Enter fee rate"
                    : parseFloat(feeRate) > 50
                      ? "~10 min"
                      : parseFloat(feeRate) > 20
                        ? "~30 min"
                        : parseFloat(feeRate) > 10
                          ? "~1 hour"
                          : "1+ hours"}
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1">Overall Health</Typography>
                <Chip
                  label={transactionHealth.overallHealth}
                  color={getHealthColor(
                    transactionHealth.overallHealth === "Excellent"
                      ? 95
                      : transactionHealth.overallHealth === "Good"
                        ? 75
                        : transactionHealth.overallHealth === "Average"
                          ? 55
                          : 30,
                  )}
                  sx={{ fontWeight: "bold" }}
                />
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", justifyContent: "center" }}>
                {autoMode ? (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={autoOptimizeUTXOs}
                    disabled={
                      loading || txDataLoading || availableUtxos.length === 0
                    }
                    startIcon={
                      loading && <CircularProgress size={20} color="inherit" />
                    }
                  >
                    {loading ? "Optimizing..." : "Auto-Optimize"}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleManualSubmit}
                    disabled={selectedUTXOs.length === 0}
                  >
                    Preview Transaction
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UTXOOptimizer;
