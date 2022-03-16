/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record"], record => {
    const FIELDS = {
        ACCOUNT: "acctnumber",
        LOCATION: "custrecord_scg_code_loc",
        DEPARTMENT: "custrecord_scg_code_dept",
        SUBSIDIARY: "custrecord_scg_code_sub",
        CLASS: "custrecord_scg_code_scategory",
        BUSINESS_UNIT: "custrecord_scg_code_bu",
        ACTIVITY_CODE: "custrecord_scg_code_act"
    };
    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const beforeSubmit = context => {};

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const afterSubmit = context => {
        try {
            if (
                context.type !== context.UserEventType.CREATE &&
                context.type !== context.UserEventType.EDIT
            )
                return;
            setExternalId(context);
        } catch (e) {
            log.error({
                title: "ERROR IN AFTER SUBMIT"
            });
        }
    };
    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const setExternalId = context => {
        const newRec = context.newRecord;
        const recType = newRec.type;
        let [newId, fieldId] = getCode(newRec, recType);
        log.debug(newId, fieldId);
        if (!newId) return;
        if (context.type === context.UserEventType.CREATE)
            record.submitFields({
                type: recType,
                id: newRec.id,
                values: { externalid: newId }
            });

        if (context.type === context.UserEventType.EDIT) {
            let { oldId, fieldId } = getCode(context.oldRecord, recType);
            let currentExtId = context.oldRecord.getValue("externalid");
            if (!currentExtId || oldId !== newId) {
                record.submitFields({
                    type: recType,
                    id: newRec.id,
                    values: { externalid: newId }
                });
            }
        }
    };

    const getCode = (rec, recType) => {
        let newId;
        let fieldId;
        switch (recType) {
            case "account":
                fieldId = FIELDS.ACCOUNT;
                newId = rec.getValue({
                    fieldId: FIELDS.ACCOUNT
                });
                break;
            case "location":
                fieldId = FIELDS.LOCATION;
                newId = rec.getValue({
                    fieldId: FIELDS.LOCATION
                });
                break;
            case "department":
                fieldId = FIELDS.DEPARTMENT;
                newId = rec.getValue({
                    fieldId: FIELDS.DEPARTMENT
                });
                break;
            case "classification":
                fieldId = FIELDS.CLASS;
                newId = rec.getValue({
                    fieldId: FIELDS.CLASS
                });
                break;
            case "subsidiary":
                fieldId = FIELDS.SUBSIDIARY;
                newId = rec.getValue({
                    fieldId: FIELDS.SUBSIDIARY
                });
                break;
            case "customrecord_cseg_scg_b_unit":
                fieldId = FIELDS.BUSINESS_UNIT;
                newId = rec.getValue({
                    fieldId: FIELDS.BUSINESS_UNIT
                });
                break;
            case "customrecord_cseg_scg_act_code":
                fieldId = FIELDS.ACTIVITY_CODE;
                newId = rec.getValue({
                    fieldId: FIELDS.ACTIVITY_CODE
                });
                break;
        }
        return [newId, fieldId];
    };

    return { afterSubmit };
});
