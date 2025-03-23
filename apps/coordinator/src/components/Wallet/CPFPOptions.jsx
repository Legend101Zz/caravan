// apps/coordinator/src/components/Wallet/CPFPOptions.jsx

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
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Grid,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const CPFPOptions = ({ transaction, network, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [outputs, setOutputs] = useState([]);
  const [feeRate, setFeeRate] = useState(
    Math.ceil((transaction.fee / transaction.size) * 2),
  );
  const [loading, setLoading] = useState(false);

  const steps = [
    "Select Output",
    "Configure Fee",
    "Review",
    "Sign & Broadcast",
  ];

  // Simulate finding outputs that could be used for CPFP
  useEffect(() => {
    // In a real implementation, you would analyze the transaction outputs
    // and identify those that are spendable by the wallet
    const simulatedOutputs = [
      { index: 0, address: "bc1q...abc", amount: "1000000", isChange: true },
      { index: 1, address: "bc1q...def", amount: "500000", isChange: false },
    ];

    const changeOutputs = simulatedOutputs.filter((output) => output.isChange);
    setOutputs(changeOutputs);

    if (changeOutputs.length > 0) {
      setSelectedOutput(changeOutputs[0]);
    }
  }, [transaction]);

  // Calculate the estimated child transaction size
  const getEstimatedChildSize = () => {
    return 150; // Default estimate for a simple transaction
  };

  // Calculate the estimated total package size (parent + child)
  const getPackageSize = () => {
    return transaction.size + getEstimatedChildSize();
  };

  // Calculate the required fee for the child transaction
  const getChildFee = () => {
    const targetCombinedFee = getPackageSize() * feeRate;
    const parentFee = transaction.fee;
    return Math.max(1000, targetCombinedFee - parentFee); // Minimum 1000 sats
  };

  // Calculate the effective fee rate for the combined package
  const getEffectiveFeeRate = () => {
    const totalFee = transaction.fee + getChildFee();
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
            method: "cpfp",
            feeRate: feeRate,
            childFee: getChildFee(),
          });
        }, 2000);
      }
    }, 1500);
  };

  // Render the Output Selection step
  const renderSelectOutput = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        {outputs.length === 0 ? (
          <Alert severity="error">
            <AlertTitle>No Spendable Outputs</AlertTitle>
            This transaction doesn't have any spendable change outputs that you
            control.
          </Alert>
        ) : (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Change Output</InputLabel>
            <Select
              value={selectedOutput ? selectedOutput.index : ""}
              onChange={handleOutputChange}
              label="Change Output"
            >
              {outputs.map((output) => (
                <MenuItem key={output.index} value={output.index}>
                  Output #{output.index} - {output.address.substring(0, 10)}...
                  ({parseInt(output.amount).toLocaleString()} sats)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          <AlertTitle>About CPFP</AlertTitle>
          <Typography variant="body2">
            Child-Pays-for-Parent (CPFP) is a fee bumping technique that works
            by creating a new transaction (the child) that spends an unconfirmed
            output from the parent transaction and includes a higher fee.
          </Typography>
          <Typography variant="body2" mt={1}>
            Miners are incentivized to mine both transactions together because
            they can only collect the child's fee after mining the parent.
          </Typography>
        </Alert>
      </Paper>

      <Box display="flex" justifyContent="flex-end">
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

  // Render the Fee Configuration step
  const renderConfigureFee = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
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
          aria-labelledby="fee-rate-slider"
          min={Math.ceil(transaction.fee / transaction.size)}
          max={Math.max(
            50,
            Math.ceil((transaction.fee / transaction.size) * 5),
          )}
          step={1}
          marks={[
            {
              value: Math.ceil(transaction.fee / transaction.size),
              label: `Current (${Math.ceil(transaction.fee / transaction.size)} sat/vB)`,
            },
            {
              value: Math.ceil((transaction.fee / transaction.size) * 2),
              label: `2x`,
            },
            {
              value: Math.ceil((transaction.fee / transaction.size) * 5),
              label: `5x`,
            },
          ]}
          valueLabelDisplay="auto"
          sx={{ mt: 6, mb: 2 }}
        />
      </Paper>

      <Paper sx={{ p: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom>
          Fee Summary
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Parent Fee
            </Typography>
            <Typography variant="body1">
              {transaction.fee.toLocaleString()} sats
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {(transaction.fee / transaction.size).toFixed(1)} sat/vB
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Child Fee
            </Typography>
            <Typography variant="body1" color="primary">
              ~{getChildFee().toLocaleString()} sats
            </Typography>
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Effective Rate
            </Typography>
            <Typography variant="body1" color="primary">
              ~{getEffectiveFeeRate()} sat/vB
            </Typography>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            Estimated confirmation time with new fee:{" "}
            <strong>~10-20 minutes</strong>
          </Typography>
        </Alert>
      </Paper>

      <Box mt={3} display="flex" justifyContent="space-between">
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleNext}
          disabled={feeRate <= transaction.fee / transaction.size}
        >
          Next
        </Button>
      </Box>
    </Box>
  );

  // Render the Review step
  const renderReview = () => (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }} variant="outlined">
        <Typography variant="subtitle1" gutterBottom>
          Transaction Details
        </Typography>

        <Box mb={2}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Parent Transaction ID
          </Typography>
          <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
            {transaction.txid}
          </Typography>
        </Box>

        <Typography variant="subtitle1" gutterBottom>
          Acceleration Summary
        </Typography>

        <Box mb={1}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Method
          </Typography>
          <Chip label="Child-Pays-for-Parent (CPFP)" color="secondary" />
        </Box>

        <Box mb={1}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Parent Fee
          </Typography>
          <Typography variant="body1">
            {transaction.fee.toLocaleString()} sats (
            {(transaction.fee / transaction.size).toFixed(1)} sat/vB)
          </Typography>
        </Box>

        <Box mb={1}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Child Fee
          </Typography>
          <Typography variant="body1" color="secondary">
            {getChildFee().toLocaleString()} sats
          </Typography>
        </Box>

        <Box mb={1}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Combined Fee Rate
          </Typography>
          <Typography variant="body1">
            {getEffectiveFeeRate()} sat/vB
          </Typography>
        </Box>

        <Box mb={1}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Output Being Spent
          </Typography>
          <Typography variant="body1">
            #{selectedOutput.index} (
            {parseInt(selectedOutput.amount).toLocaleString()} sats)
          </Typography>
        </Box>
      </Paper>

      <Alert severity="warning" sx={{ mb: 3 }}>
        <AlertTitle>Important</AlertTitle>
        <Typography variant="body2">
          This will create a new transaction that spends output #
          {selectedOutput.index} from the parent transaction. The child
          transaction will include a higher fee to increase the effective fee
          rate of the combined package.
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
          {loading ? "Creating Transaction..." : "Accelerate Transaction"}
        </Button>
      </Box>
    </Box>
  );

  // Render the Completion step
  const renderComplete = () => (
    <Box textAlign="center">
      <Box mb={3} display="flex" flexDirection="column" alignItems="center">
        <Box
          sx={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            bgcolor: "success.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <CheckCircleIcon sx={{ color: "success.main", fontSize: 40 }} />
        </Box>
        <Typography variant="h5" gutterBottom>
          CPFP Transaction Created
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Your acceleration request has been successfully processed.
        </Typography>
      </Box>

      <Paper
        sx={{ p: 3, mb: 3, maxWidth: 500, mx: "auto", textAlign: "left" }}
        elevation={1}
      >
        <Typography variant="subtitle2" gutterBottom>
          Method: Child-Pays-for-Parent (CPFP)
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Effective Fee Rate: {getEffectiveFeeRate()} sat/vB
        </Typography>
        <Typography variant="subtitle2" gutterBottom>
          Expected Confirmation: ~10-20 minutes
        </Typography>

        <Alert severity="info" sx={{ mt: 2 }}>
          A new transaction has been created that will help accelerate your
          original transaction.
        </Alert>
      </Paper>

      <Box>
        <Button variant="contained" color="primary" onClick={onComplete}>
          Done
        </Button>
      </Box>
    </Box>
  );

  // Return the appropriate component based on the active step
  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderSelectOutput();
      case 1:
        return renderConfigureFee();
      case 2:
        return renderReview();
      case 3:
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

export default CPFPOptions;
