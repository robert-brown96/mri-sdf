/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 *
 * Version  Date            Author           Remark
 * 1.00     20 Nov 2020     Doug Humberd     Handles User Events on Invoice Records
 *                          Doug Humberd     Sets the External ID = vendId when Invoice Saved
 *
 */
define(["N/record", "N/runtime", "N/search", "N/email", "N/render"]
/**
 * @param {record} record
 * @param {runtime} runtime
 * @param {search} search
 */, function (record, runtime, search, email, render) {
    /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(context) {
        try {
            //Run on Create and Edit
            if (context.type != "create" && context.type != "edit") {
                return;
            }

            var vendRec = context.newRecord;
            var vednRecId = vendRec.id;

            var tranRec = record.load({
                type: "vendor",
                id: vednRecId,
                isDynamic: true
            });

            var vendId = tranRec.getValue({
                fieldId: "entityid"
            });
            log.debug("vendId", vendId);

            var extId = vendId + "AV";
            log.debug("extId", extId);

            record.submitFields({
                type: "vendor",
                id: vednRecId,
                values: {
                    externalid: extId
                }
            });
        } catch (e) {
            mri_vend_logError(e);
        }
    }

    return {
        afterSubmit: afterSubmit
    };
});

/**
 * Logs an exception to the script execution log
 *
 * @appliedtorecord customer
 *
 * @param {String} e Exception
 * @returns {Void}
 */
function mri_vend_logError(e) {
    // Log the error based on available details
    if (e instanceof nlobjError) {
        log.error("System Error", e.getCode() + "\n" + e.getDetails());
        //alert(e.getCode() + '\n' + e.getDetails());
    } else {
        log.error("Unexpected Error", e.toString());
        //alert(e.toString());
    }
}
