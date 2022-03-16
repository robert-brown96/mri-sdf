/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 * @NModuleScope SameAccount
 *
 * Version 2.0 Bobby Brown 3/9/21
 */

define([
    "N/search",
    "N/record",
    "N/task",
    "N/runtime",
    "N/query",
    "./Lib/_scg_zab_lib.js"
], function (search, record, task, runtime, query, CONSTANTS) {
    /**
     *
     * @param context
     * @param {object} context.newRecord
     */
    const onAction = context => {
        detach_from_zab(context.newRecord);
        //createCredit(context);

        //  credit(context);
    };

    const createCredit = context => {
        const userId = runtime.getCurrentUser().id;
        let invoice = context.newRecord;
        let cM = record.transform({
            fromType: "invoice",
            fromId: invoice.id,
            toType: "creditmemo"
        });
        cM.setValue({
            fieldId: "custbody_scg_credit_reason",
            value: 5
        });
        cM.setValue({
            fieldId: "custbody_scg_approver",
            value: userId
        });
        cM.setValue({
            fieldId: "custbody_scg_cm_approval_status",
            value: 2
        });

        //Get line number with invoice where you want apply
        const lineWithInvoice = cM.findSublistLineWithValue({
            sublistId: "apply",
            fieldId: "internalid",
            value: invoice.id
        });
        log.debug({
            title: "Inv line",
            details: lineWithInvoice
        });

        //Get Total ammount of invoice
        const totalToPay = cM.getSublistValue({
            sublistId: "apply",
            fieldId: "total",
            line: lineWithInvoice
        });
        log.debug({
            title: "TOTAL",
            details: totalToPay
        });

        //Set apply to Truth (checkbox)
        cM.setSublistValue({
            sublistId: "apply",
            fieldId: "apply",
            line: lineWithInvoice,
            value: true
        });

        //set Payment amount - you may count how much you can apply in case credit memo < invoice
        cM.setSublistValue({
            sublistId: "apply",
            fieldId: "amount",
            line: lineWithInvoice,
            value: totalToPay
        });

        //save record
        cM.save();
    };

    const detach_from_zab = inv => {
        try {
            const currency = inv.getValue({
                fieldId: "currency"
            });
            const sub = inv.getValue({
                fieldId: "subsidiary"
            });
            const customer = inv.getValue({
                fieldId: "entity"
            });
            log.debug({
                title: "VALUES",
                details: `CURRENCY: ${currency}. SUB: ${sub}. CUS: ${customer}`
            });

            let filter = [
                search.createFilter({
                    name: CONSTANTS.RECORD_TYPE.ZAB_CHARGE.Field.TRANSACTION,
                    operator: search.Operator.ANYOF,
                    values: inv.id
                })
            ];

            let cusSearch = search.create({
                type: CONSTANTS.RECORD_TYPE.ZAB_CHARGE.ID,
                filters: filter,
                columns: ["internalid"]
            });
            cusSearch.run().each(result => {
                let r = record.submitFields({
                    type: CONSTANTS.RECORD_TYPE.ZAB_CHARGE.ID,
                    id: result.id,
                    values: {
                        custrecordzab_c_transaction: "",
                        custrecordzab_c_transaction_line_id: ""
                    }
                });
                return true;
            });
            let reset = task.create({
                taskType: task.TaskType.MAP_REDUCE
            });
            reset.scriptId = "customscriptzab_charge_status_mr";
            reset.submit();
        } catch (e) {
            log.error({
                title: "ERROR ",
                details: e
            });
        }
    };

    //end
    return {
        onAction: onAction
    };
}); //end
