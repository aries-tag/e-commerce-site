const express = require("express");
const axios = require("axios");
const { Transaction } = require("../../../../Models/TransactionModel");
const { sendMessageToClient } = require("../../../../socket");

const callBackRouter = express.Router();

callBackRouter.post("/:clientId", async (req, res) => {
  const clientId = req.params.clientId;

  const ResultDesc = req.body.Body.stkCallback.ResultDesc;

  if (
    ResultDesc === "DS timeout user cannot be reached" ||
    ResultDesc === "Request cancelled by user"
  ) {
    console.log(req.body);
    res.status(504).json({ message: "Request cancelled by user!" });
  } else {
    const result = req.body.Body.stkCallback.CallbackMetadata;
    sendMessageToClient(clientId, req.body.Body.stkCallback.ResultDesc);

    console.log(req.body);

    const amountPaid = result.Item[0].Value;

    const mpesaReceiptNumber = result.Item[1].Value;

    const TransactionDate = result.Item[3].Value;

    const formattedDate = (TransactionDate) => {
      const date = TransactionDate.toString();

      const TransactionYear = date.slice(0, 4);
      const TransactionMonth = date.slice(4, 6);
      const Transactiondate = date.slice(6, 8);
      const TransactionHour = date.slice(8, 10);
      const TransactionMin = date.slice(10, 12);

      const formattedTransactionDate =
        Transactiondate +
        "/" +
        TransactionMonth +
        "/" +
        TransactionYear +
        " " +
        TransactionHour +
        ":" +
        TransactionMin;

      return formattedTransactionDate;
    };

    const transactionDate = formattedDate(TransactionDate);

    const PhoneNumber = result.Item[4].Value;
    const formattedStringifiedPhoneNo = PhoneNumber.toString().replace(
      "254",
      "0"
    );
    const phoneNo = Number(formattedStringifiedPhoneNo);

    console.log("Awaiting to be saved in the database");
    console.log(amountPaid, mpesaReceiptNumber, transactionDate, phoneNo);

    const mpesaCodeExists = await Transaction.findOne({ mpesaReceiptNumber });

    if (mpesaCodeExists) {
      res.status(400);
      throw new Error("Invalid Mpesa Code");
    } else {
      const payment = await new Transaction({
        transactionDate,
        mpesaReceiptNumber,
        amountPaid,
        phoneNo,
      });
      if (payment) {
        const savedPayment = await payment.save();
        res.status(201).json(savedPayment);
        console.log(savedPayment);
      } else {
        res.status(400);
        throw new Error("Invalid Transaction");
      }
    }
    res.status(200).json({ success: true });
  }
});

module.exports = { callBackRouter };
