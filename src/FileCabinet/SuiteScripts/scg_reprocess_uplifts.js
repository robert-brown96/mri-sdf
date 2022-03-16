/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define([
    "N/record",
    "N/query",
    "N/runtime",
    "N/search",
    "N/task",
    "./Lib/moment.min"
], (record, query, runtime, search, task, moment) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} context
     * @param {string} context.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = context => {
        try {
            const inputRec = runtime.getCurrentScript().getParameter({
                name: "custscript_scg_input_rec"
            });
            log.debug({
                title: "START",
                details: inputRec
            });
            let fields = search.lookupFields({
                type: "customrecord_scg_renewal_process",
                id: inputRec,
                columns: [
                    "custrecord_scg_pr_sub",
                    "custrecord_scg_res_json",
                    "custrecord_scg_p_last_effective"
                ]
            });
            const subId = fields.custrecord_scg_pr_sub[0].value;
            const inputData = JSON.parse(fields.custrecord_scg_res_json);
            let lastNextAnn = new Date(fields.custrecord_scg_p_last_effective);
            // lastNextAnn.subtract(1, "years");
            log.debug("A", lastNextAnn);
            let toReprocess = [];
            inputData.forEach(d => {
                try {
                    record.delete({
                        type: "customrecordzab_count_data",
                        id: d.newId
                    });
                } catch (e) {
                    log.debug("record already deleted", e);
                }
                toReprocess.push(...d.oldId);
            });
            log.debug({
                title: "TO REPROCESS",
                details: toReprocess
            });
            const mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_scg_cd_processing_2"
            });
            mrTask.params = {
                custscript_scg_reprocess_subscriptions:
                    JSON.stringify(toReprocess)
            };
            record.submitFields({
                type: "customrecordzab_subscription",
                id: subId,
                values: {
                    custrecord_scg_next_anniversary: lastNextAnn,
                    custrecord_scg_uplift_log: ""
                }
            });
            mrTask.submit();
            record.delete({
                type: "customrecord_scg_renewal_process",
                id: inputRec
            });
        } catch (e) {
            log.error({
                title: "ERROR REPROCESSING RENEWAL",
                details: e
            });
        }
    };

    return { execute };
});
