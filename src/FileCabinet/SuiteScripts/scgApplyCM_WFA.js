/**
 * @NApiVersion 2.0
 * @NScriptType WorkflowActionScript
 *
 *
 * Applies CM to Invoice
 * v2 - 5/20/21 Add function to create refund when box is checked
 *
 */
define(["N/record", "N/runtime"], function (record, runtime) {
    /**
     *
     * @param context
     * @param {object} context.newRecord
     * @param {object} context.oldRecord
     * @param {integer} context.workflowId
     * @param {string} context.type
     * */
    function onAction(context) {
        try {
            //get credit memo
            var cM = context.newRecord;

            cM = record.load({
                type: context.newRecord.type,
                id: cM.id,
                isDynamic: true
            });

            var appStatus = cM.getValue({
                fieldId: "custbody_scg_cm_approval_status"
            });

            var createdFromInv = cM.getValue({
                fieldId: "createdfrom"
            });

            var applyCount = cM.getLineCount({
                sublistId: "apply"
            });

            var totalValue = cM.getValue({
                fieldId: "total"
            });

            if (createdFromInv) {
                for (var i = 0; i < applyCount; i++) {
                    var apply = cM.getSublistValue({
                        sublistId: "apply",
                        fieldId: "apply",
                        line: i
                    });
                    var invoice = cM.getSublistValue({
                        sublistId: "apply",
                        fieldId: "doc",
                        line: i
                    });
                    var amtDue = cM.getSublistValue({
                        sublistId: "apply",
                        fieldId: "due",
                        line: i
                    });
                    if (invoice == createdFromInv && apply == false) {
                        cM.selectLine({
                            sublistId: "apply",
                            line: i
                        });

                        cM.setCurrentSublistValue({
                            sublistId: "apply",
                            fieldId: "apply",
                            value: true
                        });
                        if (Number(totalValue) <= Number(amtDue)) {
                            cM.setCurrentSublistValue({
                                sublistId: "apply",
                                fieldId: "amount",
                                value: totalValue
                            });
                            cM.setValue({
                                fieldId: "applied",
                                value: totalValue
                            });
                            cM.setValue({
                                fieldId: "unapplied",
                                value: 0
                            });
                            cM.commitLine({
                                sublistId: "apply"
                            });
                        } else {
                            cM.setCurrentSublistValue({
                                sublistId: "apply",
                                fieldId: "amount",
                                line: i,
                                value: amtDue
                            });

                            cM.setValue({
                                fieldId: "applied",
                                value: amtDue
                            });
                            var unappliedAmt =
                                Number(totalValue) - Number(amtDue);

                            cM.setValue({
                                fieldId: "unapplied",
                                value: unappliedAmt
                            });
                            cM.commitLine({
                                sublistId: "apply"
                            });
                        }
                    }
                }
            }
            log.debug({ title: "user", details: runtime.getCurrentUser() });

            cM.setValue({
                fieldId: "custbody_mri_cm_approver",
                value: runtime.getCurrentUser().id
            });
            cM.setValue({
                fieldId: "custbody_scg_cm_approval_status",
                value: 2
            });

            var refundRequest = cM.getValue({
                fieldId: "custbody_scg_request_refund"
            });

            cM.save();
        } catch (e) {
            log.error({
                title: "Error Applying CM",
                details: e
            });
        }
    }

    /**
     *
     * @param {object }creditMemo
     * */
    function transformToRefund(creditMemo) {
        log.debug({
            title: "Transforming to Refund",
            details: creditMemo
        });
        try {
            var custId = creditMemo.getValue({
                fieldId: "entity"
            });
            var acctId = creditMemo.getValue("account");
            var pmtMethod = 1;

            var refundRec = record.create({
                type: record.Type.CUSTOMER_REFUND,
                isDynamic: true,
                defaultValues: {
                    entity: custId,
                    cred: creditMemo.id
                }
            });
        } catch (e) {
            log.error({
                title: "Error creating Refund",
                details: e
            });
        }
    }

    return {
        onAction: onAction
    };
});
