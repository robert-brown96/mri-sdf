/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 */
define(["N/record", "N/search", "N/runtime"], (record, search, runtime) => {
    /**
     * Defines the Scheduled script trigger point.
     * @param {Object} scriptContext
     * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
     * @since 2015.2
     */
    const execute = scriptContext => {
        try {
            let subItem = runtime
                .getCurrentScript()
                .getParameter({ name: "custscript_subitem" });
            subItem = parseInt(subItem);
            record.submitFields({
                type: "customrecordzab_subscription_item",
                id: subItem,
                values: {
                    custrecordzab_si_rate_type: 3,
                    custrecordzab_si_quantity: 1,
                    custrecordzab_si_rate: 1
                }
            });

            let customrecordzab_chargeSearchObj = search.create({
                type: "customrecordzab_charge",
                filters: [
                    ["custrecordzab_c_subscription_item", "anyof", subItem]
                ],
                columns: [
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC
                    })
                ]
            });
            customrecordzab_chargeSearchObj.run().each(result => {
                // .run().each has a limit of 4,000 results
                record.delete({
                    type: "customrecordzab_charge",
                    id: result.id
                });
                return true;
            });
            record.delete({
                type: "customrecordzab_subscription_item",
                id: subItem
            });
            log.audit("done");
        } catch (e) {
            log.error({
                title: "error deleting recs",
                details: e
            });
        }
    };

    return { execute };
});
