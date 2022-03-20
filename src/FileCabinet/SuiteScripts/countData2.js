/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 *
 */

define([
    "N/record",
    "N/search",
    "N/query",
    "N/runtime",
    "./Lib/_scg_mri_lib.js",
    "./Lib/moment.min"
], function (record, search, query, runtime, ZAB_CONSTANTS, moment) {
    /**
     *
     * @param context
     * @param {Record} context.newRecord
     * @param {Record} context.oldRecord
     * @param {string} context.type
     */
    function beforeSubmit(context) {
        try {
            // if (runtime.executionContext === runtime.ContextType.MAP_REDUCE)
            //     return;

            setNextUpliftDate(context);
        } catch (e) {
            log.error({
                title: "Error Setting Next Uplift",
                details: e
            });
        }
    }
    /**
     *
     * @param context
     * @param {Record} context.newRecord
     * @param {Record} context.oldRecord
     * @param {string} context.type
     */
    function afterSubmit(context) {
        try {
            // if (context.type !== context.UserEventType.CREATE) return;
            const subId = context.newRecord.getValue({
                fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.SUBSCRIPTION
            });
            const billingFreq = getBillingPerYear(subId);
            switch (billingFreq) {
                case 2:
                    ZAB_CONSTANTS.createBiannualRecs([context.newRecord.id]);
                    break;
                case 4:
                    ZAB_CONSTANTS.createQuarterlyRecs([context.newRecord.id]);
                    break;
                default:
                    return;
            }
        } catch (e) {
            log.error({
                title: "Error in after submit",
                details: e
            });
        }
    }

    /**
     *
     * @param context
     * @param {Record} context.newRecord
     * @param {Record} context.oldRecord
     * @param {string} context.type
     *
     * Set Bill to override when bill to site billing profile is being used
     *
     */
    function setBillTo(context) {
        //create and edit run only
        if (
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT
        )
            return;

        //load count data
        var countRec = context.newRecord;

        countRec = record.load({
            type: countRec.type,
            id: countRec.id,
            isDynamic: true
        });

        //get site account
        var site = countRec.getValue(
            ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.SITE
        );
        //get subscription
        var sub = record.load({
            type: ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.ID,
            id: countRec.getValue({
                fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.SUBSCRIPTION
            }),
            isDynamic: true
        });

        var billingProfile = sub.getValue({
            fieldId:
                ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field.BILLING_PROFILE
        });

        if (billingProfile == 2 || billingProfile == 8) {
            countRec.setValue({
                fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.BILL_TO,
                values: site
            });
            countRec.save();
        } else {
            var emails = sub.getValue({
                fieldId:
                    ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field
                        .INVOICE_EMAILS
            });
            var cd_emails = countRec.getValue({
                fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.EMAILS
            });
            if (cd_emails == "" && emails != "") {
                countRec.setValue({
                    fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.EMAILS,
                    value: emails
                });
                countRec.setValue({
                    fieldId:
                        ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field
                            .EMAIL_DELIVERY,
                    value: true
                });
                countRec.save();
            }
        }
    }

    /**
     *
     * @param context
     * @param {Record} context.newRecord
     * @param {Record} context.oldRecord
     * @param {string} context.type
     *
     * Set next uplift date
     *
     */
    function setNextUpliftDate(context) {
        //create and edit run only
        if (
            context.type !== context.UserEventType.CREATE &&
            context.type !== context.UserEventType.EDIT
        )
            return;
        const lastPDate = context.newRecord.getValue(
            ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.LAST_PROCESSED
        );
        if (lastPDate) return;

        var nextUpliftDate = new Date();
        var countRec = context.newRecord;

        var subId = countRec.getValue(
            ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.SUBSCRIPTION
        );

        //lookup fields from subscription
        /**
         *
         * @type {Object}
         * @property {Date} subFields.custrecordzab_s_start_date
         * @property {Date} subFields.custrecordzab_s_end_date
         * @property {Date} subFields.custrecord_scg_last_uplift_date
         * @property {Date} subFields.custrecord_scg_last_change_rate
         */
        var subFields = search.lookupFields({
            type: ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.ID,
            id: subId,
            columns: [
                ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field.START_DATE,
                ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field.END_DATE,
                ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field.LAST_UPLIFTED,
                ZAB_CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.Field
                    .LAST_UPLIFT_EFFECTIVE,
                "custrecord_scg_next_anniversary"
            ]
        });
        log.debug({
            title: "Sub Fields",
            details: subFields
        });

        //get effective date and convert to date
        var effective_date = countRec.getValue(
            ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.EFFECTIVE_DATE
        );
        effective_date = new Date(effective_date);

        //convert subscription start date to +1 year
        var startPlus1 = new Date(subFields.custrecordzab_s_start_date);
        startPlus1.setFullYear(startPlus1.getFullYear() + 1);

        var start_date = new Date(subFields.custrecordzab_s_start_date);

        //if count data start and subscription start are equal
        //set next uplift date to start of sub + 1 year
        if (effective_date.toString() === start_date.toString()) {
            nextUpliftDate = startPlus1;
        } else if (
            effective_date < startPlus1 &&
            !subFields.custrecord_scg_last_uplift_date &&
            subFields.custrecordzab_s_start_date !==
                subFields.custrecord_scg_next_anniversary
        ) {
            //effective date is before first uplift anniversary
            nextUpliftDate = startPlus1;
        } else {
            if (!subFields.custrecord_scg_last_change_rate) {
                nextUpliftDate = new Date(
                    subFields.custrecord_scg_next_anniversary
                );
            } else {
                var last_effective = new Date(
                    subFields.custrecord_scg_last_change_rate
                );

                last_effective.setFullYear(last_effective.getFullYear() + 1);

                nextUpliftDate = last_effective;
            }
        }
        log.debug({
            title: "Next Uplift Date",
            details: nextUpliftDate
        });
        if (
            new Date(subFields.custrecord_scg_next_anniversary) <
            new Date(effective_date)
        ) {
            countRec.setValue({
                fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.END_DATE,
                value: new Date(
                    subFields.custrecord_scg_next_anniversary.setDate(
                        subFields.custrecord_scg_next_anniversary.getDate() - 1
                    )
                )
            });
        } else {
            let a = nextUpliftDate;
            a = new Date(a.setDate(a.getDate() - 1));
            log.debug("A:" + a);

            countRec.setValue({
                fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.END_DATE,
                value: a
            });
        }
        countRec.setValue({
            fieldId: ZAB_CONSTANTS.RECORD_TYPE.ZAB_COUNT.Field.NEXT_UPLIFT,
            value: new Date(
                nextUpliftDate.setDate(nextUpliftDate.getDate() + 1)
            )
        });
    } //end set date function

    /**
     *
     * @param {Number} subId
     * @returns {Number}
     */
    const getBillingPerYear = subId => {
        try {
            log.debug({
                title: "SUBID",
                details: subId
            });
            let csQuer = query.create({
                type: "customrecordzab_subscription"
            });
            let csJoin = csQuer.autoJoin({
                fieldId: "custrecordzab_s_charge_schedule"
            });
            csQuer.condition = csQuer.createCondition({
                fieldId: "id",
                operator: query.Operator.EQUAL,
                values: subId
            });
            csQuer.columns = [
                csQuer.createColumn({
                    fieldId: "id"
                }),
                csJoin.createColumn({
                    fieldId: "custrecord_scg_bill_frequency",
                    alias: "billing_freq"
                })
            ];
            const res = csQuer.run().asMappedResults();
            if (res.length === 0) throw "ERROR WITH RESULTS";

            return res[0].billing_freq;
        } catch (e) {
            log.error({
                title: "ERROR GETTING VALUES",
                details: e
            });
        }
    };

    return {
        beforeSubmit: beforeSubmit,
        afterSubmit: afterSubmit
    };
}); //end call back
