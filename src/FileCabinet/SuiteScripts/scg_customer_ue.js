/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record"], record => {
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} scriptContext.form - Current form
     * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = scriptContext => {};

    /**
     * Defines the function definition that is executed before record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const beforeSubmit = scriptContext => {};

    /**
     * Defines the function definition that is executed after record is submitted.
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
     * @since 2015.2
     */
    const afterSubmit = scriptContext => {
        try {
            if (scriptContext.type === "create") {
                setDefaults(scriptContext);
            } else if (scriptContext.type === "edit") {
                let e = scriptContext.oldRecord.getValue({
                    fieldId: "email"
                });
                if (e === "") setDefaults(scriptContext);
            }
        } catch (e) {
            log.error({
                title: "Error after submit",
                details: e
            });
        }
    };

    /**
     *
     * @param context
     * @param {Record} context.newRecord - New record
     * @param {Record} context.oldRecord - Old record
     *
     */
    const setDefaults = context => {
        const cus = context.newRecord;
        const lineCount = cus.getLineCount({
            sublistId: "addressbook"
        });
        let addressId;

        if (lineCount > 0) {
            for (let i = 0; i < lineCount; i++) {
                let defaultBilling = cus.getSublistValue({
                    sublistId: "addressbook",
                    fieldId: "defaultbilling",
                    line: i
                });
                if (defaultBilling === true) {
                    let defaultBillingAddressRec = cus.getSublistSubrecord({
                        sublistId: "addressbook",
                        fieldId: "addressbookaddress",
                        line: i
                    });
                    let email = defaultBillingAddressRec.getValue({
                        fieldId: "custrecord_scg_address_email"
                    });
                    let additionalEmail = defaultBillingAddressRec.getValue({
                        fieldId: "custrecord_scg_a_email_list"
                    });

                    log.debug({
                        title: "CUSTOMER EMAIL",
                        details: email
                    });

                    if (email !== "") {
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: cus.id,
                            values: {
                                email: email
                            }
                        });
                    } else if (
                        additionalEmail !== "" &&
                        additionalEmail !== "undefined"
                    ) {
                        let s = additionalEmail.split(";");
                        record.submitFields({
                            type: record.Type.CUSTOMER,
                            id: cus.id,
                            values: {
                                email: s[0]
                            }
                        });
                    }
                }
            }
        }
    };

    return { afterSubmit };
});
