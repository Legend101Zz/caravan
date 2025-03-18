import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Typography,
  Paper,
  Slider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  AlertTitle,
  Grid,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import { createCPFPTransaction } from "@caravan/fees";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChildCareIcon from "@mui/icons-material/ChildCare";
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
  outputSelect: {
    marginBottom: theme.spacing(2),
  },
}));

// Steps for the CPFP flow
const STEPS = [
  "Select Output",
  "Configure Fee",
  "Review",
  "Create Transaction",
];

const CPFPOptions = ({ transaction, analysis, client, network }) => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [feeRate, setFeeRate] = useState(Math.ceil(analysis.feeRate * 2)); // Default to double the current fee rate
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [psbtResult, setPsbtResult] = useState(null);

  // Immediately analyze the transaction to find possible change outputs
  useEffect(() => {
    // In a real implementation, you would identify change outputs
    // For this example, we'll simulate it with some placeholder data
    const simulatedOutputs = analysis.outputs || [
      { index: 0, address: "bc1q...abc", amount: "1000000", isChange: true },
      { index: 1, address: "bc1q...def", amount: "500000", isChange: false },
    ];

    const changeOutputs = simulatedOutputs.filter((output) => output.isChange);
    setOutputs(changeOutputs);

    if (changeOutputs.length > 0) {
      setSelectedOutput(changeOutputs[0]);
    }
  }, [analysis]);

  // Calculate the estimated child transaction size
  const getEstimatedChildSize = () => {
    // This should come from the analysis or be calculated based on the input/output count
    return analysis.estimatedChildSize || 150; // Default fallback value
  };

  // Calculate the estimated total package size (parent + child)
  const getPackageSize = () => {
    return analysis.vsize + getEstimatedChildSize();
  };

  // Calculate the required fee for the child transaction
  const getChildFee = () => {
    const targetCombinedFee = getPackageSize() * feeRate;
    const parentFee = parseInt(analysis.fee, 10);
    const childFee = Math.max(1000, targetCombinedFee - parentFee); // Minimum 1000 sats
    return Math.ceil(childFee);
  };

  // Calculate the effective fee rate for the combined package
  const getEffectiveFeeRate = () => {
    const totalFee = parseInt(analysis.fee, 10) + getChildFee();
    return (totalFee / getPackageSize()).toFixed(2);
  };

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleOutputChange = (event) => {
    const selected = outputs.find(
      (output) => output.index === event.target.value,
    );
    setSelectedOutput(selected);
  };

  const handleFeeRateChange = (event, newValue) => {
    setFeeRate(newValue);
  };

  const handleCustomFeeRateChange = (event) => {
    const value = event.target.value;
    if (value === "" || /^[0-9]+$/.test(value)) {
      setFeeRate(value === "" ? analysis.feeRate : parseInt(value, 10));
    }
  };

  const handleCreateTransaction = async () => {
    setLoading(true);
    setError("");

    try {
      // In a real implementation, you would get available UTXOs for the change address
      // This is placeholder code - you'll need to adapt it to your actual wallet data
      const availableUtxos = []; // This would come from your wallet service

      const psbtBase64 = createCPFPTransaction({
        originalTx: transaction.hex,
        availableInputs: availableUtxos,
        spendableOutputIndex: selectedOutput.index,
        changeAddress: "", // This would come from your wallet
        network,
        dustThreshold: "546",
        scriptType: analysis.addressType || "P2WSH", // Default to P2WSH if not specified
        targetFeeRate: feeRate,
        absoluteFee: analysis.fee,
        requiredSigners: analysis.requiredSigners || 2,
        totalSigners: analysis.totalSigners || 3,
      });

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
      const filename = `cpfp-${transaction.txid.substring(0, 8)}.psbt`;
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
              Select Spendable Output
            </Typography>

            <Paper className={classes.paper} variant="outlined">
              {outputs.length === 0 ? (
                <Alert severity="error">
                  <AlertTitle>No Spendable Outputs</AlertTitle>
                  This transaction doesn't have any spendable change outputs
                  that you control.
                </Alert>
              ) : (
                <FormControl fullWidth className={classes.outputSelect}>
                  <InputLabel>Change Output</InputLabel>
                  <Select
                    value={selectedOutput ? selectedOutput.index : ""}
                    onChange={handleOutputChange}
                    label="Change Output"
                  >
                    {outputs.map((output) => (
                      <MenuItem key={output.index} value={output.index}>
                        Output #{output.index} -{" "}
                        {output.address.substring(0, 10)}... (
                        {parseInt(output.amount).toLocaleString()} sats)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Alert severity="info" className={classes.infoBox}>
                <AlertTitle>About CPFP</AlertTitle>
                <Typography variant="body2">
                  Child-Pays-for-Parent (CPFP) is a fee bumping technique that
                  works by creating a new transaction (the child) that spends an
                  unconfirmed output from the parent transaction and includes a
                  higher fee.
                </Typography>
                <Typography variant="body2" mt={1}>
                  Miners are incentivized to mine both transactions together
                  because they can only collect the child's fee after mining the
                  parent.
                </Typography>
              </Alert>
            </Paper>

            <Box className={classes.confirmButtons}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={outputs.length === 0 || !selectedOutput}
              >
                Next
              </Button>
            </Box>
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
                Target Fee Rate
              </Typography>

              <Typography variant="body2" color="textSecondary" gutterBottom>
                Set the target fee rate for the combined package (parent + child
                transactions)
              </Typography>

              <Slider
                value={feeRate}
                onChange={handleFeeRateChange}
                min={Math.ceil(analysis.feeRate)}
                max={Math.max(50, Math.ceil(analysis.feeRate * 5))}
                step={1}
                marks={[
                  {
                    value: Math.ceil(analysis.feeRate),
                    label: `Current (${Math.ceil(analysis.feeRate)} sat/vB)`,
                  },
                  { value: Math.ceil(analysis.feeRate * 2), label: `2x` },
                  { value: Math.ceil(analysis.feeRate * 5), label: `5x` },
                ]}
                valueLabelDisplay="auto"
                className={classes.slider}
              />

              <TextField
                label="Custom Fee Rate"
                value={feeRate}
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

              <Box className={classes.infoBox}>
                <Typography variant="subtitle2" gutterBottom>
                  Fee Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">
                      Parent Fee: {analysis.fee} sats (
                      {analysis.feeRate.toFixed(1)} sats/vB)
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">
                      Child Fee: ~{getChildFee()} sats
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography variant="body2">
                      Effective Rate: ~{getEffectiveFeeRate()} sats/vB
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
                disabled={feeRate < analysis.feeRate}
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
              Review CPFP Transaction
            </Typography>

            <Paper className={classes.paper} variant="outlined">
              <Typography variant="subtitle2" className={classes.summaryItem}>
                Parent Transaction ID: <code>{transaction.txid}</code>
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Parent Fee: {analysis.fee} sats ({analysis.feeRate.toFixed(1)}{" "}
                sats/vB)
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Child Fee: ~{getChildFee()} sats
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Combined Fee: ~{parseInt(analysis.fee, 10) + getChildFee()} sats
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Effective Fee Rate: ~{getEffectiveFeeRate()} sats/vB
              </Typography>

              <Typography variant="subtitle2" className={classes.summaryItem}>
                Output Being Spent: #{selectedOutput.index} (
                {parseInt(selectedOutput.amount).toLocaleString()} sats)
              </Typography>

              <Alert severity="info" className={classes.infoBox}>
                <AlertTitle>Note</AlertTitle>
                <Typography variant="body2">
                  This will create a new transaction that spends output #
                  {selectedOutput.index} from the parent transaction. The child
                  transaction will include a higher fee to increase the
                  effective fee rate of the combined package.
                </Typography>
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
                  Your CPFP transaction has been created successfully.
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

CPFPOptions.propTypes = {
  transaction: PropTypes.shape({
    txid: PropTypes.string.isRequired,
    hex: PropTypes.string.isRequired,
  }).isRequired,
  analysis: PropTypes.shape({
    fee: PropTypes.string.isRequired,
    feeRate: PropTypes.number.isRequired,
    vsize: PropTypes.number.isRequired,
    outputs: PropTypes.arrayOf(
      PropTypes.shape({
        index: PropTypes.number.isRequired,
        address: PropTypes.string.isRequired,
        amount: PropTypes.string.isRequired,
        isChange: PropTypes.bool.isRequired,
      }),
    ),
    estimatedChildSize: PropTypes.number,
    addressType: PropTypes.string,
    requiredSigners: PropTypes.number,
    totalSigners: PropTypes.number,
  }).isRequired,
  client: PropTypes.shape({
    type: PropTypes.string.isRequired,
  }).isRequired,
  network: PropTypes.string.isRequired,
};

export default CPFPOptions;
