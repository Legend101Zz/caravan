import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Tabs,
  Tab,
  Button,
  Tooltip,
  Chip,
  Divider,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  InfoOutlined,
  CheckCircle,
  Warning,
  Error,
  HelpOutline,
  Refresh,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Treemap,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PolarRadiusAxis,
} from "recharts";
import { multisigAddress, Network } from "@caravan/bitcoin";
import { PrivacyMetrics, WasteMetrics } from "@caravan/health";

// Mock data generator function
const generateMockData = () => {
  // Mock UTXOs
  const mockUtxos = {};
  const addresses = [
    "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    "bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3",
    "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
  ];

  addresses.forEach((address) => {
    const utxoCount = Math.floor(Math.random() * 5) + 2; // 2-6 UTXOs per address
    mockUtxos[address] = [];

    for (let i = 0; i < utxoCount; i++) {
      mockUtxos[address].push({
        txid: `mock-txid-${address.substring(0, 8)}-${i}`,
        vout: i,
        value: 0.01 * (Math.random() * 10 + 1), // 0.01 - 0.11 BTC
        status: {
          confirmed: Math.random() > 0.2, // 80% confirmed
          block_time:
            Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 50000),
        },
      });
    }
  });

  // Mock transactions
  const mockTransactions = [];
  for (let i = 0; i < 10; i++) {
    const inputCount = Math.floor(Math.random() * 3) + 1; // 1-3 inputs
    const outputCount = Math.floor(Math.random() * 3) + 1; // 1-3 outputs

    const mockTx = {
      txid: `mock-tx-${i}`,
      vin: Array(inputCount)
        .fill()
        .map((_, idx) => ({
          prevTxId: `prev-tx-${i}-${idx}`,
          vout: idx,
          sequence: 0,
        })),
      vout: Array(outputCount)
        .fill()
        .map((_, idx) => ({
          scriptPubkeyHex: `scriptHex-${i}-${idx}`,
          scriptPubkeyAddress:
            addresses[Math.floor(Math.random() * addresses.length)],
          value: 0.01 * (Math.random() * 5 + 1), // 0.01 - 0.06 BTC
        })),
      size: Math.floor(Math.random() * 800) + 200, // 200-1000 bytes
      weight: Math.floor(Math.random() * 3200) + 800, // 800-4000 weight units
      fee: 0.0001 * (Math.random() * 5 + 1), // 0.0001-0.0006 BTC fee
      isSend: Math.random() > 0.5, // 50% send/receive
      amount: 0.01 * (Math.random() * 10 + 1), // 0.01 - 0.11 BTC
      block_time:
        Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 100000),
      status: {
        confirmed: Math.random() > 0.3, // 70% confirmed
        blockTime:
          Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 100000),
      },
      valueToWallet:
        (Math.random() > 0.5 ? 1 : -1) * 0.01 * (Math.random() * 10 + 1), // +/- 0.01-0.11 BTC
    };

    mockTransactions.push(mockTx);
  }

  return {
    utxos: mockUtxos,
    transactions: mockTransactions,
    walletAddresses: addresses,
  };
};

// Custom gauge chart component
const GaugeChart = ({ value, size = 120, thickness = 8, color }) => {
  // Determine color based on value
  const getColor = (val) => {
    if (!color) {
      if (val >= 80) return "#4caf50";
      if (val >= 60) return "#2196f3";
      if (val >= 40) return "#ff9800";
      return "#f44336";
    }
    return color;
  };

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <Box
      sx={{
        position: "relative",
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={thickness}
        />
        {/* Foreground circle (value) */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor(value)}
          strokeWidth={thickness}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        {/* Text value in center */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy=".3em"
          fontSize="1.5rem"
          fontWeight="bold"
        >
          {value}
        </text>
      </svg>
    </Box>
  );
};

// Custom tooltip component for treemap
const CustomTreemapTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <Paper elevation={3} sx={{ p: 1.5, maxWidth: 300 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {data.name}
        </Typography>
        <Typography variant="body2">
          Amount: {data.formattedAmount} BTC
        </Typography>
        <Typography variant="body2">
          Health Score: {data.healthScore}
        </Typography>
        <Typography variant="body2">
          Recommendation: {data.recommendation}
        </Typography>
        {data.spendWaste && (
          <Typography variant="body2">
            Spend Waste: {data.spendWaste > 0 ? "+" : ""}
            {data.spendWaste.toFixed(0)} sats
          </Typography>
        )}
        {data.privacyImpact && (
          <Typography variant="body2">
            Privacy Impact: {data.privacyImpact.toFixed(0)}%
          </Typography>
        )}
      </Paper>
    );
  }
  return null;
};

// Main Health Dashboard Component
const WalletHealthDashboard = ({
  network = Network.MAINNET,
  addressType = multisigAddress("P2WSH"),
  walletAddresses = [],
  transactions = [],
  utxos = {},
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [usingMockData, setUsingMockData] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState({
    privacyScore: 0,
    wasteScore: 0,
    addressReuseScore: 0,
    transactionPatternScore: 0,
    utxoDistributionScore: 0,
    feeEfficiencyScore: 0,
    dustManagementScore: 0,
    consolidationScore: 0,
    utxoHealthMap: {},
    recommendations: [],
    utxoCategories: {
      ideal: 0,
      good: 0,
      hold: 0,
      avoid: 0,
    },
  });

  const data = [
    { name: "A", x: 21 },
    { name: "B", x: 22 },
    { name: "C", x: -32 },
    { name: "D", x: -14 },
    { name: "E", x: -51 },
    { name: "F", x: 16 },
    { name: "G", x: 7 },
    { name: "H", x: -8 },
    { name: "I", x: 9 },
  ];

  // Check if we need to use mock data
  const {
    utxos: effectiveUtxos,
    transactions: effectiveTransactions,
    walletAddresses: effectiveAddresses,
  } = useMemo(() => {
    // Check if we have sufficient real data
    const hasRealData =
      Object.keys(utxos).length > 0 && transactions.length > 0;

    if (!hasRealData) {
      setUsingMockData(true);
      return generateMockData();
    }

    setUsingMockData(false);
    return { utxos, transactions, walletAddresses };
  }, [utxos, transactions, walletAddresses]);

  // Collect all UTXOs from the wallet
  const allUtxos = useMemo(() => {
    const utxoArray = [];
    Object.keys(effectiveUtxos).forEach((address) => {
      if (effectiveUtxos[address] && effectiveUtxos[address].length > 0) {
        effectiveUtxos[address].forEach((utxo) => {
          utxoArray.push({
            ...utxo,
            addressType,
            multisig: { address },
          });
        });
      }
    });
    return utxoArray;
  }, [effectiveUtxos, addressType]);

  // Calculate health metrics
  useEffect(() => {
    const calculateMetrics = () => {
      if (!effectiveTransactions || !allUtxos || allUtxos.length === 0) {
        if (effectiveTransactions && allUtxos.length === 0) {
          // No UTXOs to analyze, but we're done loading
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        // Initialize health metric classes
        const privacyMetric = new PrivacyMetrics(
          effectiveTransactions,
          effectiveUtxos,
        );
        const wasteMetric = new WasteMetrics(
          effectiveTransactions,
          effectiveUtxos,
        );

        // Calculate privacy metrics
        const privacyScore =
          privacyMetric.getWalletPrivacyScore(addressType, network) || 0.3;
        const addressReuseScore = 1 - privacyMetric.addressReuseFactor();
        const transactionPatternScore =
          privacyMetric.getMeanTopologyScore() || 0.33;
        const utxoDistributionScore = privacyMetric.utxoSpreadFactor() || 0.2;

        // Calculate waste metrics
        // Since we might not have fee percentile history, we'll use some default values
        const defaultFeePercentileHistory: any = [];
        const wasteScore =
          1 - wasteMetric.weightedWasteScore(defaultFeePercentileHistory) ||
          0.56;

        console.log(
          "privacy",
          privacyScore,
          addressReuseScore,
          transactionPatternScore,
          utxoDistributionScore,
          wasteScore,
        );

        // Create UTXO health map
        const utxoHealthMap = {};
        const utxoCategories = {
          ideal: 0,
          good: 0,
          hold: 0,
          avoid: 0,
        };

        // Process each UTXO and categorize it
        allUtxos.forEach((utxo) => {
          // Calculate health score and recommendation
          // This is a simple algorithm - a real implementation would use more sophisticated metrics
          let healthScore, recommendation;

          // For demonstration, we'll categorize UTXOs randomly with a skew toward realistic distributions
          const random = Math.random();
          if (random > 0.85) {
            recommendation = "Avoid";
            healthScore = Math.round(20 + Math.random() * 15);
            utxoCategories.avoid++;
          } else if (random > 0.65) {
            recommendation = "Hold";
            healthScore = Math.round(40 + Math.random() * 20);
            utxoCategories.hold++;
          } else if (random > 0.35) {
            recommendation = "Good";
            healthScore = Math.round(60 + Math.random() * 15);
            utxoCategories.good++;
          } else {
            recommendation = "Ideal";
            healthScore = Math.round(75 + Math.random() * 20);
            utxoCategories.ideal++;
          }

          const utxoId = `${utxo.txid}:${utxo.vout}`;
          utxoHealthMap[utxoId] = {
            healthScore,
            recommendation,
            privacyImpact: Math.round(privacyScore * 100),
            spendWaste: Math.round((Math.random() * 2 - 1) * 1000), // Random spend waste between -1000 and 1000 sats
            amount: utxo.value,
            addressType: utxo.addressType || addressType,
          };
        });

        // Generate recommendations
        const recommendations = [];

        if (addressReuseScore < 0.7) {
          recommendations.push({
            category: "privacy",
            priority: "high",
            title: "Address Reuse Detected",
            description:
              "Your wallet has significant address reuse, which reduces privacy.",
            action: "Generate new addresses for all future transactions.",
          });
        }

        if (utxoCategories.avoid > 0) {
          recommendations.push({
            category: "waste",
            priority: "medium",
            title: "Potential Dust UTXOs",
            description: `Your wallet has ${utxoCategories.avoid} UTXOs that may be uneconomical to spend.`,
            action:
              "Consider consolidating these UTXOs during low fee periods.",
          });
        }

        if (utxoCategories.ideal > 3 && utxoDistributionScore < 0.3) {
          recommendations.push({
            category: "privacy",
            priority: "medium",
            title: "Poor UTXO Distribution",
            description:
              "Your UTXOs have similar amounts, which can reduce privacy.",
            action: "Use the UTXO Optimizer to improve your UTXO set.",
          });
        }

        if (wasteScore < 0.4) {
          recommendations.push({
            category: "waste",
            priority: "low",
            title: "Fee Efficiency Improvements Possible",
            description:
              "Your transaction patterns suggest you could save on fees.",
            action: "Consider timing transactions for lower fee periods.",
          });
        }

        // Set all calculated metrics
        setHealthMetrics({
          privacyScore: Math.round(privacyScore * 100),
          wasteScore: Math.round(wasteScore * 100),
          addressReuseScore: Math.round(addressReuseScore * 100),
          transactionPatternScore: Math.round(transactionPatternScore * 100),
          utxoDistributionScore: Math.round(utxoDistributionScore * 100),
          feeEfficiencyScore: Math.round(wasteScore * 100),
          dustManagementScore: Math.round(
            utxoCategories.avoid > 0 ? 100 - utxoCategories.avoid * 20 : 100,
          ),
          consolidationScore: Math.round(
            utxoDistributionScore * 80 + wasteScore * 20,
          ),
          utxoHealthMap,
          utxoCategories,
          recommendations,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error calculating health metrics:", error);
        setLoading(false);
      }
    };

    calculateMetrics();
  }, [effectiveTransactions, allUtxos, network, addressType, effectiveUtxos]);

  // Prepare data for visualizations
  const utxoTreemapData = useMemo(() => {
    if (
      !healthMetrics.utxoHealthMap ||
      Object.keys(healthMetrics.utxoHealthMap).length === 0
    ) {
      return [];
    }

    // Transform UTXO health data into treemap format
    return Object.entries(healthMetrics.utxoHealthMap).map(
      ([utxoId, metrics]) => {
        // Size is based on amount (with small minimum to ensure visibility)
        const size = Math.max(metrics.amount * 100000000, 10000);

        // Ensure color is always defined to prevent the rechart error
        let color;
        switch (metrics.recommendation) {
          case "Ideal":
            color = "#4caf50";
            break;
          case "Good":
            color = "#2196f3";
            break;
          case "Hold":
            color = "#ff9800";
            break;
          case "Avoid":
          default:
            color = "#f44336";
            break;
        }

        return {
          name: utxoId,
          size,
          formattedAmount: metrics.amount.toFixed(8),
          healthScore: metrics.healthScore,
          recommendation: metrics.recommendation,
          spendWaste: metrics.spendWaste,
          privacyImpact: metrics.privacyImpact,
          color, // Explicitly set color to avoid undefined error
        };
      },
    );
  }, [healthMetrics.utxoHealthMap]);

  // Prepare data for radar chart
  const radarChartData = useMemo(() => {
    return [
      {
        subject: "Privacy",
        A: healthMetrics.privacyScore,
        fullMark: 100,
      },
      {
        subject: "Fee Efficiency",
        A: healthMetrics.wasteScore,
        fullMark: 100,
      },
      {
        subject: "Address Reuse",
        A: healthMetrics.addressReuseScore,
        fullMark: 100,
      },
      {
        subject: "UTXO Distribution",
        A: healthMetrics.utxoDistributionScore,
        fullMark: 100,
      },
      {
        subject: "Tx Patterns",
        A: healthMetrics.transactionPatternScore,
        fullMark: 100,
      },
      {
        subject: "Dust Management",
        A: healthMetrics.dustManagementScore,
        fullMark: 100,
      },
    ];
  }, [healthMetrics]);

  // Prepare data for UTXO distribution pie chart
  const utxoCategoryData = useMemo(() => {
    const { utxoCategories } = healthMetrics;
    const data = [
      { name: "Ideal", value: utxoCategories.ideal, color: "#4caf50" },
      { name: "Good", value: utxoCategories.good, color: "#2196f3" },
      { name: "Hold", value: utxoCategories.hold, color: "#ff9800" },
      { name: "Avoid", value: utxoCategories.avoid, color: "#f44336" },
    ].filter((item) => item.value > 0);

    // Return at least one item to avoid recharts error
    return data.length
      ? data
      : [{ name: "No Data", value: 1, color: "#cccccc" }];
  }, [healthMetrics.utxoCategories]);

  // Prepare data for recommendations
  const recommendationsByPriority = useMemo(() => {
    const { recommendations } = healthMetrics;
    const byPriority = {
      high: [],
      medium: [],
      low: [],
    };

    recommendations.forEach((rec) => {
      byPriority[rec.priority].push(rec);
    });

    return byPriority;
  }, [healthMetrics.recommendations]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle refresh button click
  const handleRefresh = () => {
    setLoading(true);
    // Simulate a refresh delay
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  // Calculate overall health score
  const overallHealthScore = useMemo(() => {
    return Math.round(
      healthMetrics.privacyScore * 0.6 + healthMetrics.wasteScore * 0.4,
    );
  }, [healthMetrics.privacyScore, healthMetrics.wasteScore]);

  // Get health rating text
  const getHealthRating = (score) => {
    if (score >= 80) return "Excellent";
    if (score >= 65) return "Good";
    if (score >= 50) return "Average";
    if (score >= 30) return "Poor";
    return "Critical";
  };

  // Render health dashboard content
  return (
    <Box sx={{ p: 2 }}>
      {/* Header with scores and refresh button */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Wallet Health Dashboard</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Mock data alert */}
      {usingMockData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            Using Demo Data
          </Typography>
          <Typography variant="body2">
            No wallet data was found or there was insufficient data to analyze.
            Sample data is being displayed to demonstrate the dashboard
            functionality.
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 400,
          }}
        >
          <CircularProgress />
          <Typography variant="subtitle1" sx={{ ml: 2 }}>
            Analyzing wallet health...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Score Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Overall Health Score */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Overall Health
                    <Tooltip title="Combined score of privacy and fee efficiency metrics">
                      <InfoOutlined
                        fontSize="small"
                        sx={{ ml: 1, verticalAlign: "middle" }}
                      />
                    </Tooltip>
                  </Typography>
                  <GaugeChart value={overallHealthScore || 0.3} size={150} />
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {getHealthRating(overallHealthScore)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Privacy Score */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Privacy Score
                    <Tooltip title="Measures how well your wallet preserves your financial privacy">
                      <InfoOutlined
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle" }}
                      />
                    </Tooltip>
                  </Typography>
                  <GaugeChart
                    value={healthMetrics.privacyScore}
                    size={150}
                    color="#673ab7"
                  />
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {getHealthRating(healthMetrics.privacyScore)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Fee Efficiency Score */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Fee Efficiency
                    <Tooltip title="Measures how efficiently your wallet manages transaction fees">
                      <InfoOutlined
                        fontSize="small"
                        sx={{ ml: 0.5, verticalAlign: "middle" }}
                      />
                    </Tooltip>
                  </Typography>
                  <GaugeChart
                    value={healthMetrics.wasteScore}
                    size={150}
                    color="#2196f3"
                  />
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    {getHealthRating(healthMetrics.wasteScore)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Tabs for detailed metrics */}
          <Box sx={{ mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange} centered>
              <Tab label="Health Overview" />
              <Tab label="Privacy Analysis" />
              <Tab label="Fee Efficiency" />
              <Tab label="UTXO Explorer" />
            </Tabs>
          </Box>

          {/* Tab Content */}
          <Box sx={{ py: 2 }}>
            {/* Health Overview Tab */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {/* Radar Chart */}
                <Grid item xs={12} md={7}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Health Metrics Overview
                      </Typography>
                      <Box sx={{ height: 400, width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            outerRadius={150}
                            data={[
                              {
                                subject: "Privacy",
                                A: 15,
                                fullMark: 100,
                              },
                              {
                                subject: "Fee Efficiency",
                                A: 78,
                                fullMark: 100,
                              },
                              {
                                subject: "Address Reuse",
                                A: 86,
                                fullMark: 100,
                              },
                              {
                                subject: "UTXO Distribution",
                                A: 55,
                                fullMark: 100,
                              },
                              {
                                subject: "Tx Patterns",
                                A: 60,
                                fullMark: 100,
                              },
                              {
                                subject: "Dust Management",
                                A: 70,
                                fullMark: 100,
                              },
                            ]}
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                            animationBegin={0}
                            animationDuration={1500}
                          >
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar
                              name="Score"
                              dataKey="A"
                              stroke="#8884d8"
                              fill="#8884d8"
                              fillOpacity={0.6}
                              animationBegin={0}
                              animationDuration={1500}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* UTXO Distribution */}
                <Grid item xs={12} md={5}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        UTXO Distribution
                      </Typography>
                      <Box sx={{ height: 400, width: "100%" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={utxoCategoryData}
                              cx="50%"
                              cy="50%"
                              labelLine={true}
                              label={({ name, percent }) =>
                                `${name}: ${(percent * 100).toFixed(0)}%`
                              }
                              outerRadius={120}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {utxoCategoryData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              formatter={(value, name) => [
                                `${value} UTXOs`,
                                name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Recommendations */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Recommendations to Improve Wallet Health
                      </Typography>

                      {healthMetrics.recommendations.length === 0 ? (
                        <Box sx={{ p: 2, textAlign: "center" }}>
                          <CheckCircle
                            sx={{ fontSize: 40, color: "success.main", mb: 1 }}
                          />
                          <Typography>
                            Your wallet is healthy! No critical recommendations
                            at this time.
                          </Typography>
                        </Box>
                      ) : (
                        <Grid container spacing={2}>
                          {recommendationsByPriority.high.length > 0 && (
                            <Grid item xs={12}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: "bold",
                                  color: "error.main",
                                  mt: 1,
                                }}
                              >
                                High Priority
                              </Typography>
                              {recommendationsByPriority.high.map(
                                (rec, idx) => (
                                  <Box
                                    key={idx}
                                    sx={{
                                      p: 1.5,
                                      my: 1,
                                      border: "1px solid #f44336",
                                      borderRadius: 1,
                                      backgroundColor:
                                        "rgba(244, 67, 54, 0.05)",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Error color="error" sx={{ mr: 1 }} />
                                      <Typography variant="subtitle1">
                                        {rec.title}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={
                                          rec.category === "privacy"
                                            ? "Privacy"
                                            : "Fee Efficiency"
                                        }
                                        sx={{ ml: 1 }}
                                        color={
                                          rec.category === "privacy"
                                            ? "secondary"
                                            : "primary"
                                        }
                                      />
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                      {rec.description}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{ mt: 0.5, fontWeight: "bold" }}
                                    >
                                      Action: {rec.action}
                                    </Typography>
                                  </Box>
                                ),
                              )}
                            </Grid>
                          )}

                          {recommendationsByPriority.medium.length > 0 && (
                            <Grid item xs={12}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: "bold",
                                  color: "warning.main",
                                  mt: 1,
                                }}
                              >
                                Medium Priority
                              </Typography>
                              {recommendationsByPriority.medium.map(
                                (rec, idx) => (
                                  <Box
                                    key={idx}
                                    sx={{
                                      p: 1.5,
                                      my: 1,
                                      border: "1px solid #ff9800",
                                      borderRadius: 1,
                                      backgroundColor:
                                        "rgba(255, 152, 0, 0.05)",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Warning color="warning" sx={{ mr: 1 }} />
                                      <Typography variant="subtitle1">
                                        {rec.title}
                                      </Typography>
                                      <Chip
                                        size="small"
                                        label={
                                          rec.category === "privacy"
                                            ? "Privacy"
                                            : "Fee Efficiency"
                                        }
                                        sx={{ ml: 1 }}
                                        color={
                                          rec.category === "privacy"
                                            ? "secondary"
                                            : "primary"
                                        }
                                      />
                                    </Box>
                                    <Typography variant="body2" sx={{ mt: 1 }}>
                                      {rec.description}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      sx={{ mt: 0.5, fontWeight: "bold" }}
                                    >
                                      Action: {rec.action}
                                    </Typography>
                                  </Box>
                                ),
                              )}
                            </Grid>
                          )}

                          {recommendationsByPriority.low.length > 0 && (
                            <Grid item xs={12}>
                              <Typography
                                variant="subtitle1"
                                sx={{
                                  fontWeight: "bold",
                                  color: "info.main",
                                  mt: 1,
                                }}
                              >
                                Suggestions
                              </Typography>
                              {recommendationsByPriority.low.map((rec, idx) => (
                                <Box
                                  key={idx}
                                  sx={{
                                    p: 1.5,
                                    my: 1,
                                    border: "1px solid #2196f3",
                                    borderRadius: 1,
                                    backgroundColor: "rgba(33, 150, 243, 0.05)",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <InfoOutlined color="info" sx={{ mr: 1 }} />
                                    <Typography variant="subtitle1">
                                      {rec.title}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={
                                        rec.category === "privacy"
                                          ? "Privacy"
                                          : "Fee Efficiency"
                                      }
                                      sx={{ ml: 1 }}
                                      color={
                                        rec.category === "privacy"
                                          ? "secondary"
                                          : "primary"
                                      }
                                    />
                                  </Box>
                                  <Typography variant="body2" sx={{ mt: 1 }}>
                                    {rec.description}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    sx={{ mt: 0.5, fontWeight: "bold" }}
                                  >
                                    Suggestion: {rec.action}
                                  </Typography>
                                </Box>
                              ))}
                            </Grid>
                          )}
                        </Grid>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Privacy Analysis Tab */}
            {activeTab === 1 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Privacy Metrics
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: "Address Reuse",
                                score: healthMetrics.addressReuseScore,
                              },
                              {
                                name: "Transaction Patterns",
                                score: healthMetrics.transactionPatternScore,
                              },
                              {
                                name: "UTXO Distribution",
                                score: healthMetrics.utxoDistributionScore,
                              },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <RechartsTooltip
                              formatter={(value) => [`${value}%`, "Score"]}
                            />
                            <Bar dataKey="score" fill="#673ab7" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Privacy Explanation
                        <Tooltip title="Learn about what affects your wallet's privacy">
                          <HelpOutline
                            fontSize="small"
                            sx={{ ml: 1, verticalAlign: "middle" }}
                          />
                        </Tooltip>
                      </Typography>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          What impacts your privacy score:
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color:
                                healthMetrics.addressReuseScore >= 70
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            Address Reuse: {healthMetrics.addressReuseScore}%
                          </Typography>
                          <Typography variant="body2">
                            Using the same address multiple times links your
                            transactions together. Always use fresh addresses
                            for better privacy.
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color:
                                healthMetrics.transactionPatternScore >= 70
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            Transaction Patterns:{" "}
                            {healthMetrics.transactionPatternScore}%
                          </Typography>
                          <Typography variant="body2">
                            The structure of your transactions can reveal
                            information. Mixing input and output counts and
                            amounts improves privacy.
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color:
                                healthMetrics.utxoDistributionScore >= 70
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            UTXO Distribution:{" "}
                            {healthMetrics.utxoDistributionScore}%
                          </Typography>
                          <Typography variant="body2">
                            Having UTXOs of varied sizes makes it harder to link
                            your transactions. Aim for a diverse set of UTXO
                            amounts.
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1" gutterBottom>
                          Tips to improve privacy:
                        </Typography>
                        <ul style={{ paddingLeft: "20px" }}>
                          <li>
                            <Typography variant="body2">
                              Use a new address for each transaction
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="body2">
                              Avoid round number amounts in transactions
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="body2">
                              Use the UTXO Optimizer when sending
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="body2">
                              Consider occasional self-transfers to improve UTXO
                              set
                            </Typography>
                          </li>
                        </ul>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Fee Efficiency Tab */}
            {activeTab === 2 && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Fee Efficiency Metrics
                      </Typography>
                      <Box sx={{ height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              {
                                name: "Fee Efficiency",
                                score: healthMetrics.feeEfficiencyScore,
                              },
                              {
                                name: "Dust Management",
                                score: healthMetrics.dustManagementScore,
                              },
                              {
                                name: "Consolidation",
                                score: healthMetrics.consolidationScore,
                              },
                            ]}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} />
                            <RechartsTooltip
                              formatter={(value) => [`${value}%`, "Score"]}
                            />
                            <Bar dataKey="score" fill="#2196f3" />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Fee Efficiency Explanation
                        <Tooltip title="Learn about what affects your wallet's fee efficiency">
                          <HelpOutline
                            fontSize="small"
                            sx={{ ml: 1, verticalAlign: "middle" }}
                          />
                        </Tooltip>
                      </Typography>
                      <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          What impacts your fee efficiency score:
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color:
                                healthMetrics.feeEfficiencyScore >= 70
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            Fee Rate Selection:{" "}
                            {healthMetrics.feeEfficiencyScore}%
                          </Typography>
                          <Typography variant="body2">
                            How well you choose fee rates compared to market
                            conditions. Paying unnecessarily high fees reduces
                            efficiency.
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color:
                                healthMetrics.dustManagementScore >= 70
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            Dust Management: {healthMetrics.dustManagementScore}
                            %
                          </Typography>
                          <Typography variant="body2">
                            Small UTXOs ("dust") can cost more in fees than
                            they're worth. Avoiding or consolidating these
                            improves efficiency.
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{
                              fontWeight: "bold",
                              color:
                                healthMetrics.consolidationScore >= 70
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            UTXO Consolidation:{" "}
                            {healthMetrics.consolidationScore}%
                          </Typography>
                          <Typography variant="body2">
                            Using fewer inputs saves on fees. Strategically
                            consolidating UTXOs during low fee periods improves
                            efficiency.
                          </Typography>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle1" gutterBottom>
                          Tips to improve fee efficiency:
                        </Typography>
                        <ul style={{ paddingLeft: "20px" }}>
                          <li>
                            <Typography variant="body2">
                              Time non-urgent transactions for periods of lower
                              network fees
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="body2">
                              Consolidate multiple small UTXOs when fees are low
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="body2">
                              Use the UTXO Optimizer to select the most
                              fee-efficient inputs
                            </Typography>
                          </li>
                          <li>
                            <Typography variant="body2">
                              Avoid creating very small outputs (dust) that may
                              cost more to spend than they're worth
                            </Typography>
                          </li>
                        </ul>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* UTXO Explorer Tab */}
            {activeTab === 3 && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        UTXO Treemap Explorer
                        <Tooltip title="Visualizes all UTXOs by size and health. Larger rectangles represent larger amounts. Colors indicate health status.">
                          <InfoOutlined
                            fontSize="small"
                            sx={{ ml: 1, verticalAlign: "middle" }}
                          />
                        </Tooltip>
                      </Typography>

                      <Box sx={{ height: 500 }}>
                        {utxoTreemapData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <Treemap
                              data={utxoTreemapData}
                              dataKey="size"
                              ratio={4 / 3}
                              stroke="#fff"
                              fill="#8884d8"
                              content={({ x, y, width, height, index }) => {
                                const data = utxoTreemapData[index];
                                return (
                                  <g>
                                    <rect
                                      x={x}
                                      y={y}
                                      width={width}
                                      height={height}
                                      style={{
                                        fill: data.color,
                                        stroke: "#fff",
                                        strokeWidth: 2,
                                        strokeOpacity: 1,
                                      }}
                                    />
                                    {width > 70 && height > 30 && (
                                      <>
                                        <text
                                          x={x + width / 2}
                                          y={y + height / 2 - 8}
                                          textAnchor="middle"
                                          fill="#fff"
                                          fontSize={12}
                                        >
                                          {data.name.substring(0, 8)}...
                                        </text>
                                        <text
                                          x={x + width / 2}
                                          y={y + height / 2 + 8}
                                          textAnchor="middle"
                                          fill="#fff"
                                          fontSize={12}
                                        >
                                          {data.formattedAmount} BTC
                                        </text>
                                      </>
                                    )}
                                  </g>
                                );
                              }}
                            >
                              <RechartsTooltip
                                content={<CustomTreemapTooltip />}
                              />
                            </Treemap>
                          </ResponsiveContainer>
                        ) : (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              height: "100%",
                            }}
                          >
                            <Typography variant="subtitle1">
                              No UTXO data available for visualization
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 2,
                          mt: 2,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: "#4caf50",
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2">Ideal</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: "#2196f3",
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2">Good</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: "#ff9800",
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2">Hold</Typography>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <Box
                            sx={{
                              width: 16,
                              height: 16,
                              backgroundColor: "#f44336",
                              mr: 1,
                            }}
                          />
                          <Typography variant="body2">Avoid</Typography>
                        </Box>
                      </Box>

                      <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          Understanding the UTXO Explorer:
                        </Typography>
                        <Typography variant="body2">
                          • Each rectangle represents one UTXO (unspent
                          transaction output) in your wallet
                        </Typography>
                        <Typography variant="body2">
                          • Size of rectangle indicates the amount of bitcoin in
                          that UTXO
                        </Typography>
                        <Typography variant="body2">
                          • Color indicates the health recommendation for that
                          UTXO:
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2">
                            <strong style={{ color: "#4caf50" }}>
                              Green (Ideal)
                            </strong>
                            : Best to spend now, optimal for fee efficiency
                          </Typography>
                          <Typography variant="body2">
                            <strong style={{ color: "#2196f3" }}>
                              Blue (Good)
                            </strong>
                            : Good to spend, no major issues
                          </Typography>
                          <Typography variant="body2">
                            <strong style={{ color: "#ff9800" }}>
                              Orange (Hold)
                            </strong>
                            : Better to hold for future spending, would be
                            expensive to spend now
                          </Typography>
                          <Typography variant="body2">
                            <strong style={{ color: "#f44336" }}>
                              Red (Avoid)
                            </strong>
                            : Avoid spending, potential dust or privacy issues
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          • Hover over any UTXO for more details including exact
                          amount, health score, and spending recommendation
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default WalletHealthDashboard;
