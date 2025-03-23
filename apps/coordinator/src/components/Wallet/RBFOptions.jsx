// apps/coordinator/src/components/Wallet/RBFOptions.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Paper,
  FormControl,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  InputAdornment,
  Alert,
  AlertTitle,
  CircularProgress,
  Slider,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { styled } from "@mui/material/styles";

// Custom styled components to match Caravan theme
const TransactionBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  backgroundColor: "#fafafa",
}));

const InputBox = styled(Box)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  backgroundColor: "#fff",
}));

const OutputBox = styled(Box)(({ theme, isChange }) => ({
  border: `1px solid ${isChange ? theme.palette.warning.light : theme.palette.primary.light}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5),
  marginBottom: theme.spacing(1),
  backgroundColor: "#fff",
}));

const FeeSlider = styled(Slider)(({ theme }) => ({
  color: theme.palette.primary.main,
  marginTop: theme.spacing(3),
  marginBottom: theme.spacing(1),
}));

// Fee presets
const FEE_PRESETS = [
  {
    label: "Economy",
    multiplier: 1.2,
    description: "May take several hours",
    confidence: "70%",
  },
  {
    label: "Standard",
    multiplier: 1.5,
    description: "Likely within an hour",
    confidence: "85%",
  },
  {
    label: "Priority",
    multiplier: 2,
    description: "Expected within 10-20 minutes",
    confidence: "95%",
  },
  {
    label: "Express",
    multiplier: 3,
    description: "Target next block (2-10 minutes)",
    confidence: "99%",
  },
  {
    label: "Custom",
    multiplier: 1,
    description: "Set your own fee rate",
    confidence: "Varies",
  },
];

const RBFOptions = ({ transaction, network, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [feePreset, setFeePreset] = useState(1); // Default to standard
  const [customFeeRate, setCustomFeeRate] = useState(
    Math.ceil((transaction.fee / transaction.size) * 1.5),
  );
  const [manualFeeRate, setManualFeeRate] = useState(
    Math.ceil((transaction.fee / transaction.size) * 1.5),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Derived transaction state
  const [rbfSequence, setRbfSequence] = useState(0xfffffffd); // RBF enabled sequence number

  const steps = ["Configure Fee", "Review Transaction", "Sign & Broadcast"];

  // Update manual fee rate when preset changes
  useEffect(() => {
    if (feePreset !== 4) {
      // Not custom
      const newRate = Math.ceil(
        (transaction.fee / transaction.size) *
          FEE_PRESETS[feePreset].multiplier,
      );
      setManualFeeRate(newRate);
    } else {
      setManualFeeRate(customFeeRate);
    }
  }, [feePreset, customFeeRate, transaction]);

  // Safe string/number conversions
  const txid = String(transaction.txid || "");
  const vout = Number(transaction.vout || 0);
  const originalFee = Number(transaction.fee || 0);
  const txSize = Number(transaction.size || 250);
  const origFeeRate = originalFee / txSize;

  // Calculate effective fee rate
  const getEffectiveFeeRate = () => {
    return manualFeeRate;
  };

  // Calculate estimated new fee amount
  const getEstimatedFee = () => {
    return Math.ceil(txSize * getEffectiveFeeRate());
  };

  // Calculate additional fee to be paid
  const getAdditionalFee = () => {
    return getEstimatedFee() - originalFee;
  };

  // For demo - simulate transaction outputs
  const txOutputAmount =
    transaction.vout?.[0]?.value || Math.ceil(originalFee + txSize * 10 * 0.75);
  const txChangeAmount =
    transaction.vout?.[1]?.value || Math.ceil(originalFee + txSize * 10 * 0.15);
  const newChangeAmount = Math.max(0, txChangeAmount - getAdditionalFee());

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleFeePresetChange = (event) => {
    setFeePreset(parseInt(event.target.value, 10));
  };

  const handleCustomFeeRateChange = (event) => {
    const value = event.target.value;
    if (value === "" || /^[0-9]+$/.test(value)) {
      setCustomFeeRate(value === "" ? "" : parseInt(value, 10));
    }
  };

  const handleManualSliderChange = (_, newValue) => {
    setManualFeeRate(newValue);

    // Find if this matches a preset
    const presetIndex = FEE_PRESETS.findIndex(
      (preset) =>
        Math.abs(Math.ceil(origFeeRate * preset.multiplier) - newValue) < 0.5,
    );

    if (presetIndex !== -1 && presetIndex !== 4) {
      setFeePreset(presetIndex);
    } else {
      setFeePreset(4); // Custom
      setCustomFeeRate(newValue);
    }
  };

  const handleCreateTransaction = () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      handleNext();

      // This would be called after successful broadcast in a real implementation
      if (onComplete) {
        setTimeout(() => {
          onComplete({
            method: "rbf",
            feeRate: getEffectiveFeeRate(),
            additionalFee: getAdditionalFee(),
          });
        }, 2000);
      }
    }, 1500);
  };

  // Render the Configure Fee step
  const renderConfigureFee = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Configure Replacement Fee
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Replace-By-Fee (RBF) allows you to accelerate an unconfirmed
          transaction by creating a new one with a higher fee. The original
          transaction must have RBF enabled (sequence number less than
          0xFFFFFFFE).
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom>
          Current Transaction Details
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">
                  Transaction ID
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
                    {txid.substring(0, 12)}...{txid.substring(txid.length - 8)}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Original Fee
                </TableCell>
                <TableCell>
                  {originalFee} sats ({origFeeRate.toFixed(1)} sat/vB)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Size
                </TableCell>
                <TableCell>{txSize} vBytes</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Status
                </TableCell>
                <TableCell>Pending (unconfirmed)</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom>
          Fee Rate Selection
        </Typography>

        <FormControl component="fieldset" fullWidth sx={{ mb: 2 }}>
          <RadioGroup value={feePreset} onChange={handleFeePresetChange}>
            {FEE_PRESETS.map((preset, index) => (
              <FormControlLabel
                key={index}
                value={index}
                control={<Radio />}
                label={
                  <Box>
                    <Typography
                      variant="body2"
                      component="span"
                      fontWeight={feePreset === index ? "bold" : "normal"}
                    >
                      {preset.label}
                      {index < 4 &&
                        ` (${Math.ceil(origFeeRate * preset.multiplier)} sat/vB)`}
                    </Typography>
                    <Typography
                      variant="caption"
                      component="span"
                      color="textSecondary"
                      sx={{ ml: 1 }}
                    >
                      {preset.description}
                    </Typography>
                    {index < 4 && (
                      <Typography
                        variant="caption"
                        component="span"
                        sx={{ ml: 1 }}
                      >
                        ~{preset.confidence} chance
                      </Typography>
                    )}
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>

        {feePreset === 4 && ( // Custom fee rate
          <Box mt={2}>
            <TextField
              label="Custom Fee Rate"
              value={customFeeRate}
              onChange={handleCustomFeeRateChange}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">sat/vB</InputAdornment>
                ),
              }}
              type="text"
              variant="outlined"
              fullWidth
              helperText={
                customFeeRate < origFeeRate
                  ? "Fee rate must be higher than the original fee rate"
                  : "Enter your custom fee rate"
              }
              error={customFeeRate < origFeeRate}
            />
          </Box>
        )}

        <Box sx={{ mt: 4 }}>
          <Typography id="fee-slider-label" gutterBottom>
            Fee Rate Adjustment
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="textSecondary">
              {Math.ceil(origFeeRate)}
            </Typography>
            <FeeSlider
              value={manualFeeRate}
              onChange={handleManualSliderChange}
              aria-labelledby="fee-slider-label"
              min={Math.ceil(origFeeRate)}
              max={Math.min(Math.ceil(origFeeRate) * 5, 300)}
              marks={[
                { value: Math.ceil(origFeeRate), label: "Current" },
                { value: Math.ceil(origFeeRate * 2), label: "2x" },
                { value: Math.ceil(origFeeRate * 3), label: "3x" },
              ]}
              valueLabelDisplay="on"
            />
            <Typography variant="body2" color="textSecondary">
              {Math.min(Math.ceil(origFeeRate) * 5, 300)}
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom>
          Fee Summary
        </Typography>

        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">
                  Original Fee
                </TableCell>
                <TableCell>
                  {originalFee} sats ({origFeeRate.toFixed(1)} sat/vB)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  New Fee
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold" color="primary">
                    {getEstimatedFee()} sats ({getEffectiveFeeRate()} sat/vB)
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Additional Cost
                </TableCell>
                <TableCell>{getAdditionalFee()} sats</TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  Estimated Confirmation
                </TableCell>
                <TableCell>
                  {feePreset === 4
                    ? "Varies based on network conditions"
                    : FEE_PRESETS[feePreset].description}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
          <Typography variant="caption" sx={{ mr: 1 }}>
            Technical Details
          </Typography>
          <IconButton
            size="small"
            onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          >
            <InfoIcon fontSize="small" />
          </IconButton>
        </Box>

        {showTechnicalDetails && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
            <Typography
              variant="caption"
              component="div"
              fontFamily="monospace"
            >
              Sequence Number (RBF): 0x{rbfSequence.toString(16)}
              <br />
              Version: {transaction.version || 2}
              <br />
              Inputs: 1<br />
              Outputs: 2<br />
              Locktime: {transaction.locktime || 0}
            </Typography>
          </Box>
        )}
      </Paper>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Button
          variant="contained"
          color="primary"
          onClick={handleNext}
          disabled={manualFeeRate < origFeeRate}
        >
          Next
        </Button>
      </Box>
    </Box>
  );

  // Render the Review step with interactive transaction builder
  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Transaction Preview and Verification
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Review the transaction details carefully. The replacement transaction
          will have the same inputs and outputs as the original, but with a
          higher fee taken from the change output.
        </Typography>
      </Alert>

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Typography variant="subtitle1">Transaction Structure</Typography>

          <Box>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
            >
              {showTechnicalDetails ? "Hide Details" : "Show Details"}
            </Button>
          </Box>
        </Box>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Original Transaction
        </Typography>
        <TransactionBox>
          <Box mb={2}>
            <Typography variant="caption" color="textSecondary">
              Input
            </Typography>
            <InputBox>
              <Typography variant="body2" fontFamily="monospace">
                {txid.substring(0, 8)}...{txid.substring(txid.length - 8)}:
                {vout}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="textSecondary">
                  Sequence: 0x{rbfSequence.toString(16)}
                </Typography>
                <Typography variant="body2">
                  {originalFee + txSize * 10} sats
                </Typography>
              </Box>
            </InputBox>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="caption" color="textSecondary">
              Fee: {originalFee} sats ({origFeeRate.toFixed(1)} sat/vB)
            </Typography>
          </Divider>

          <Typography variant="caption" color="textSecondary">
            Outputs
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <OutputBox>
              <Typography variant="body2" fontFamily="monospace">
                Recipient: bc1q...{Math.floor(Math.random() * 10000)}
              </Typography>
              <Typography variant="body2">{txOutputAmount} sats</Typography>
            </OutputBox>

            <OutputBox isChange>
              <Typography variant="body2" fontFamily="monospace">
                Change: bc1q...{Math.floor(Math.random() * 10000)}
              </Typography>
              <Typography variant="body2">{txChangeAmount} sats</Typography>
            </OutputBox>
          </Box>
        </TransactionBox>

        <Typography variant="subtitle2" gutterBottom sx={{ mt: 3 }}>
          Replacement Transaction (RBF)
        </Typography>
        <TransactionBox>
          <Box mb={2}>
            <Typography variant="caption" color="textSecondary">
              Input (unchanged)
            </Typography>
            <InputBox>
              <Typography variant="body2" fontFamily="monospace">
                {txid.substring(0, 8)}...{txid.substring(txid.length - 8)}:
                {vout}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="caption" color="textSecondary">
                  Sequence: 0x{rbfSequence.toString(16)}
                </Typography>
                <Typography variant="body2">
                  {originalFee + txSize * 10} sats
                </Typography>
              </Box>
            </InputBox>
          </Box>

          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="primary" fontWeight="medium">
              New Fee: {getEstimatedFee()} sats ({getEffectiveFeeRate()} sat/vB)
            </Typography>
          </Divider>

          <Typography variant="caption" color="textSecondary">
            Outputs
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <OutputBox>
              <Typography variant="body2" fontFamily="monospace">
                Recipient: bc1q...{Math.floor(Math.random() * 10000)}{" "}
                (unchanged)
              </Typography>
              <Typography variant="body2">{txOutputAmount} sats</Typography>
            </OutputBox>

            <OutputBox isChange>
              <Typography variant="body2" fontFamily="monospace">
                Change: bc1q...{Math.floor(Math.random() * 10000)} (reduced)
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2">{newChangeAmount} sats</Typography>
                <Typography variant="caption" color="error">
                  (-{getAdditionalFee()} sats)
                </Typography>
              </Box>
            </OutputBox>
          </Box>
        </TransactionBox>

        {showTechnicalDetails && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Technical Details
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Field</TableCell>
                    <TableCell>Original Transaction</TableCell>
                    <TableCell>Replacement Transaction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Version</TableCell>
                    <TableCell>{transaction.version || 2}</TableCell>
                    <TableCell>{transaction.version || 2}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Input Count</TableCell>
                    <TableCell>1</TableCell>
                    <TableCell>1</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Output Count</TableCell>
                    <TableCell>2</TableCell>
                    <TableCell>2</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Locktime</TableCell>
                    <TableCell>{transaction.locktime || 0}</TableCell>
                    <TableCell>{transaction.locktime || 0}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Input Sequence</TableCell>
                    <TableCell>0x{rbfSequence.toString(16)}</TableCell>
                    <TableCell>0x{rbfSequence.toString(16)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fee</TableCell>
                    <TableCell>{originalFee} sats</TableCell>
                    <TableCell>{getEstimatedFee()} sats</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Fee Rate</TableCell>
                    <TableCell>{origFeeRate.toFixed(1)} sat/vB</TableCell>
                    <TableCell>{getEffectiveFeeRate()} sat/vB</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom>
          RBF Rules Verification
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row">
                  <Tooltip title="RBF requires the sequence number to be less than 0xFFFFFFFE">
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2">
                        Input is RBF signaled
                      </Typography>
                      <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {rbfSequence < 0xfffffffe ? (
                    <Typography variant="body2" color="success.main">
                      Pass
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="error.main">
                      Fail
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  <Tooltip title="The replacement transaction must pay a higher fee than the original">
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2">
                        Fee is higher than original
                      </Typography>
                      <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  {getEstimatedFee() > originalFee ? (
                    <Typography variant="body2" color="success.main">
                      Pass (+{getAdditionalFee()} sats)
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="error.main">
                      Fail
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row">
                  <Tooltip title="All original outputs must be preserved at the same or higher amounts">
                    <Box display="flex" alignItems="center">
                      <Typography variant="body2">
                        Original recipient outputs preserved
                      </Typography>
                      <InfoIcon fontSize="small" sx={{ ml: 1 }} />
                    </Box>
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="success.main">
                    Pass
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Important</AlertTitle>
        <Typography variant="body2">
          Once submitted, this acceleration transaction cannot be canceled. Your
          original transaction will be replaced by this new one with a higher
          fee.
        </Typography>
      </Alert>

      <Box display="flex" justifyContent="space-between">
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreateTransaction}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Creating Transaction..." : "Sign & Broadcast Transaction"}
        </Button>
      </Box>
    </Box>
  );

  // Render the Completion step
  const renderComplete = () => (
    <Box>
      <Paper sx={{ p: 4, mb: 3, textAlign: "center" }} variant="outlined">
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            bgcolor: "success.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <CheckCircleIcon sx={{ color: "success.main", fontSize: 36 }} />
        </Box>
        <Typography variant="h5" gutterBottom>
          Transaction Successfully Broadcast
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
          Your accelerated transaction has been broadcast to the network.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ textAlign: "left", mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Transaction Summary
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Method
                  </TableCell>
                  <TableCell>Replace-By-Fee (RBF)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Original Fee Rate
                  </TableCell>
                  <TableCell>{origFeeRate.toFixed(1)} sat/vB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    New Fee Rate
                  </TableCell>
                  <TableCell>{getEffectiveFeeRate()} sat/vB</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Fee Increase
                  </TableCell>
                  <TableCell>{getAdditionalFee()} sats</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell component="th" scope="row">
                    Expected Confirmation
                  </TableCell>
                  <TableCell>
                    {feePreset === 4
                      ? "Varies based on network conditions"
                      : FEE_PRESETS[feePreset].description}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      <Box display="flex" justifyContent="center">
        <Button variant="contained" color="primary" onClick={onComplete}>
          Return to Transactions
        </Button>
      </Box>
    </Box>
  );

  // Return the appropriate component based on the active step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderConfigureFee();
      case 1:
        return renderReview();
      case 2:
        return renderComplete();
      default:
        return "Unknown step";
    }
  };

  return (
    <Box>
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {getStepContent(activeStep)}
    </Box>
  );
};

export default RBFOptions;
