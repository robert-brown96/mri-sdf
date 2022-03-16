/**
 /**
 * @NApiVersion 2.1
 * @NScriptType MassUpdateScript
 */
define(["N/record", "N/search"], (record, search) => {
    /**
     * Defines the Mass Update trigger point.
     * @param {Object} params
     * @param {string} params.type - Record type of the record being processed
     * @param {number} params.id - ID of the record being processed
     * @since 2016.1
     */
    const each = params => {
        try {
            //lookup transaction id
            const fields = search.lookupFields({
                type: params.type,
                id: params.id,
                columns: ["custbody_scg_legacy_inv"]
            });
            const tranNum = fields.custbody_scg_legacy_inv;
            log.debug({
                title: params.id,
                details: tranNum
            });
            if (tranNum)
                record.submitFields({
                    type: params.type,
                    id: params.id,
                    values: {
                        externalid: tranNum
                    }
                });
        } catch (e) {
            log.error({
                title: "ERROR SETTING EXTERNAL ID",
                details: e
            });
        }
    };

    return { each };
});
