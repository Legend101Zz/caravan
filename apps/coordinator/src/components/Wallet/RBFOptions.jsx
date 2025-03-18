import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Paper,
  Slider,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  AlertTitle,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import {
  createAcceleratedRbfTransaction,
  createCancelRbfTransaction,
  TransactionAnalyzer,
} from "@caravan/fees";
import SpeedIcon from "@mui/icons-material/Speed";
import CancelIcon from "@mui/icons-material/Cancel";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { downloadFile } from "../../utils";

const useStyles = makeStyles((theme) => ({
  section: {
    marginBottom: theme.spacing(3),
  },
  paper: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  slider: {
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
  },
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
  },
  infoBox: {
    margin: theme.spacing(2, 0),
  },
  stepper: {
    marginBottom: theme.spacing(3),
  },
  summaryItem: {
    marginBottom: theme.spacing(1),
  },
  resultBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.success.light,
    borderRadius: theme.shape.borderRadius,
  },
  confirmButtons: {
    marginTop: theme.spacing(2),
  },
  optionCard: {
    cursor: "pointer",
    transition: "transform 0.2s",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: theme.shadows[4],
    },
  },
  selectedCard: {
    borderColor: theme.palette.primary.main,
    borderWidth: 2,
  },
}));

// Steps for the RBF flow
const STEPS = [
  "Select Option",
  "Configure Fee",
  "Review",
  "Create Transaction",
];

// Fee preset options
const FEE_PRESETS = [
  {
    label: "Low Priority",
    multiplier: 1.2,
    description: "May take several hours",
  },
  {
    label: "Medium Priority",
    multiplier: 1.5,
    description: "Likely within an hour",
  },
  {
    label: "High Priority",
    multiplier: 2,
    description: "Expected within 10-20 minutes",
  },
  { label: "Custom", multiplier: 1, description: "Set your own fee rate" },
];

const RBFOptions = ({ transaction, analysis, client, network }) => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [rbfType, setRbfType] = useState("accelerate"); // "accelerate" or "cancel"
  const [feePreset, setFeePreset] = useState(1); // Default to medium priority
  const [customFeeRate, setCustomFeeRate] = useState(
    Math.ceil(analysis.feeRate * 1.5),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [psbtResult, setPsbtResult] = useState(null);

  // Calculate effective fee rate based on selected preset or custom value
  const getEffectiveFeeRate = () => {
    if (feePreset === 3) {
      // Custom
      return customFeeRate;
    }
    return Math.ceil(analysis.feeRate * FEE_PRESETS[feePreset].multiplier);
  };

  // Calculate estimated new fee amount
  const getEstimatedFee = () => {
    const effectiveFeeRate = getEffectiveFeeRate();
    const minFee = parseInt(analysis.estimatedRBFFee, 10);
    const estimatedFee = Math.ceil(analysis.vsize * effectiveFeeRate);
    return Math.max(minFee, estimatedFee);
  };

  // Format satoshis as BTC
  const formatSatsToBTC = (sats) => {
    return (parseInt(sats, 10) / 100000000).toFixed(8);
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleRBFTypeChange = (type) => {
    setRbfType(type);
    handleNext();
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

  const handleCreateTransaction = async () => {
    setLoading(true);
    setError("");

    try {
      const effectiveFeeRate = getEffectiveFeeRate();

      // Get available UTXOs - in a real implementation, you'd get these from your wallet
      // This is placeholder code - you'll need to adapt it to your actual wallet data
      const availableUtxos = []; // This would come from your wallet service

      let psbtBase64;

      if (rbfType === "accelerate") {
        psbtBase64 = createAcceleratedRbfTransaction({
          originalTx: transaction.hex,
          availableInputs: availableUtxos,
          network,
          dustThreshold: "546",
          scriptType: analysis.addressType || "P2WSH", // Default to P2WSH if not specified
          requiredSigners: analysis.requiredSigners || 2,
          totalSigners: analysis.totalSigners || 3,
          targetFeeRate: effectiveFeeRate,
          absoluteFee: analysis.fee,
          changeAddress: "", // This would come from your wallet
        });
      } else {
        psbtBase64 = createCancelRbfTransaction({
          originalTx: transaction.hex,
          availableInputs: availableUtxos,
          cancelAddress: "", // This would come from your wallet
          network,
          dustThreshold: "546",
          scriptType: analysis.addressType || "P2WSH",
          requiredSigners: analysis.requiredSigners || 2,
          totalSigners: analysis.totalSigners || 3,
          targetFeeRate: effectiveFeeRate,
          absoluteFee: analysis.fee,
        });
      }

      setPsbtResult(psbtBase64);
      handleNext();
    } catch (err) {
      setError(`Error creating transaction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPSBT = () => {
    if (psbtResult) {
      const filename = `${rbfType === "accelerate" ? "speedup" : "cancel"}-${transaction.txid.substring(0, 8)}.psbt`;
      downloadFile(psbtResult, filename);
    }
  };

  // Render step content based on active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select RBF Option
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card
                  className={classes.optionCard}
                  variant="outlined"
                  onClick={() => handleRBFTypeChange("accelerate")}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <SpeedIcon color="primary" fontSize="large" />
                      <Typography variant="h6" ml={1}>
                        Speed Up Transaction
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      Create a new transaction with the same outputs but a
                      higher fee to accelerate confirmation.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card
                  className={classes.optionCard}
                  variant="outlined"
                  onClick={() => handleRBFTypeChange("cancel")}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center" mb={2}>
                      <CancelIcon color="error" fontSize="large" />
                      <Typography variant="h6" ml={1}>
                        Cancel Transaction
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      Create a new transaction that returns all funds back to
                      your wallet, canceling the original transaction.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Configure Fee Rate
            </Typography>

            <Paper className={classes.paper} variant="outlined">
              <Typography variant="subtitle1" gutterBottom>
                Fee Priority
              </Typography>

              <FormControl component="fieldset">
                <RadioGroup value={feePreset} onChange={handleFeePresetChange}>
                  {FEE_PRESETS.map((preset, index) => (
                    <FormControlLabel
                      key={index}
                      value={index}
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body1">
                            {preset.label}
                            {index < 3 &&
                              ` (${(analysis.feeRate * preset.multiplier).toFixed(1)} sats/vB)`}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {preset.description}
                          </Typography>
                        </Box>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>

              {feePreset === 3 && ( // Custom fee rate
                <Box mt={2}>
                  <TextField
                    label="Custom Fee Rate"
                    value={customFeeRate}
                    onChange={handleCustomFeeRateChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">sats/vB</InputAdornment>
                      ),
                    }}
                    type="text"
                    variant="outlined"
                    fullWidth
                  />
                </Box>
              )}

              <Box className={classes.infoBox}>
                <Typography variant="subtitle2" gutterBottom>
                  Fee Comparison
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      Current Fee: {analysis.fee} sats (
                      {analysis.feeRate.toFixed(1)} sats/vB)
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2">
                      New Fee: ~{getEstimatedFee()} sats (
                      {getEffectiveFeeRate()} sats/vB)
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </Paper>

            <Box className={classes.confirmButtons}>
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={
                  feePreset === 3 &&
                  (customFeeRate === "" || customFeeRate < analysis.feeRate)
                }
              >
                Next
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review {rbfType === "accelerate" ? "Speed Up" : "Cancel"}{" "}
              Transaction
            </Typography>

            <Paper className={classes.paper} variant="outlined">
              <Typography variant="subtitle2" className={classes.summaryItem}>
                Transaction ID: <code>{transaction.txid}</code>
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Original Fee: {analysis.fee} sats ({analysis.feeRate.toFixed(1)}{" "}
                sats/vB)
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                New Fee: ~{getEstimatedFee()} sats ({getEffectiveFeeRate()}{" "}
                sats/vB)
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Fee Increase: ~{getEstimatedFee() - parseInt(analysis.fee, 10)}{" "}
                sats
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Action:{" "}
                {rbfType === "accelerate"
                  ? "Speed up transaction with same outputs"
                  : "Cancel transaction and return funds to wallet"}
              </Typography>

              <Alert severity="info" className={classes.infoBox}>
                <AlertTitle>Note</AlertTitle>
                {rbfType === "accelerate"
                  ? "This will create a replacement transaction with the same recipients but a higher fee."
                  : "This will create a transaction that sends all funds back to your wallet, canceling the original transaction."}
              </Alert>
            </Paper>

            <Box className={classes.confirmButtons}>
              <Button onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateTransaction}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? "Creating..." : "Create Transaction"}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" className={classes.infoBox}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            )}
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Transaction Created
            </Typography>

            {psbtResult && (
              <Box className={classes.resultBox}>
                <Box display="flex" alignItems="center" mb={2}>
                  <CheckCircleIcon color="success" fontSize="large" />
                  <Typography variant="h6" ml={1}>
                    PSBT Created Successfully
                  </Typography>
                </Box>

                <Typography variant="body1" paragraph>
                  Your{" "}
                  {rbfType === "accelerate" ? "accelerated" : "cancellation"}{" "}
                  transaction has been created successfully.
                </Typography>

                <Typography variant="body2" paragraph>
                  You can now download the PSBT file and sign it with your
                  wallet or hardware device.
                </Typography>

                <Box mt={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleDownloadPSBT}
                  >
                    Download PSBT
                  </Button>
                </Box>
              </Box>
            )}

            {!psbtResult && (
              <Alert severity="error" className={classes.infoBox}>
                <AlertTitle>Error</AlertTitle>
                No transaction was created. Please try again.
              </Alert>
            )}

            <Box className={classes.confirmButtons}>
              <Button onClick={() => setActiveStep(0)} sx={{ mr: 1 }}>
                Start Over
              </Button>
            </Box>
          </Box>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  return (
    <Box className={classes.section}>
      <Stepper activeStep={activeStep} className={classes.stepper}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {renderStepContent()}
    </Box>
  );
};

RBFOptions.propTypes = {
  transaction: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    hex: PropTypes.string.isRequired,
  }).isRequired,
  analysis: PropTypes.shape({
    fee: PropTypes.string.isRequired,
    feeRate: PropTypes.number.isRequired,
    vsize: PropTypes.number.isRequired,
    estimatedRBFFee: PropTypes.string.isRequired,
    addressType: PropTypes.string,
    requiredSigners: PropTypes.number,
    totalSigners: PropTypes.number,
  }).isRequired,
  client: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  network: PropTypes.string.isRequired,
};

export default RBFOptions;
