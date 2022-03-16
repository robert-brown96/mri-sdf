/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(["N/task"], task => {
    /**
     * Defines the WorkflowAction script trigger point.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.workflowId - Internal ID of workflow which triggered this action
     * @param {string} context.type - Event type
     * @param {Form} context.form - Current form that the script uses to interact with the record
     * @since 2016.1
     */
    const onAction = context => {
        try {
            const schedTask = task.create({
                taskType: task.TaskType.SCHEDULED_SCRIPT,
                scriptId: "customscript_scg_ss_reprocess",
                deploymentId: "customdeploy_scg_repro",
                params: {
                    custscript_scg_input_rec: context.newRecord.id
                }
            });
            schedTask.submit();
        } catch (e) {
            log.error({
                title: "ERROR SENDING TO SCHEDULED SCRIPT",
                details: e
            });
        }
    };

    return { onAction };
});
