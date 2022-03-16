/**
 * @NApiVersion 2.1
 *
 * @author Bobby Brown
 */
define(["N/record", "N/search", "N/file", "./lodash.min", "./moment.min"], (
    record,
    search,
    file,
    _,
    moment
) => {
    //define export object
    let exports = {};
    //export constants
    exports.RECORD_TYPE = {
        NS_TRANSACTION: {
            Body_Field: {
                USAGE_STRING_DETAIL: "custbody_scg_stringify_usage",
                USAGE_NEED: "custbody_usage_detail_need",
                USAGE_FILE: "custbody_scg_usage_file_attach",
                EZYPAY_TYPE: "custbody_scg_ezypay_method",
                EZYPAY_TOKEN: "custbody_scg_ezy_pmt_meth_token"
            },
            LINE: {}
        },
        ZAB_CHARGE: {
            ID: "customrecordzab_charge",
            Field: {
                INTERNAL_ID: "internalid",
                SUBSCRIPTION_ITEM: "custrecordzab_c_subscription_item",
                TRANSACTION: "custrecordzab_c_transaction",
                START_DATE: "custrecordzab_c_charge_period_start_date",
                END_DATE: "custrecordzab_c_charge_period_end_date",
                SUBSCRIPTION: "custrecordzab_c_subscription"
            }
        },
        ZAB_COUNT: {
            ID: "customrecordzab_count_data",
            Field: {
                EFFECTIVE_DATE: "custrecordzab_cd_effective_date",
                END_DATE: "custrecordzab_cd_end_date",
                SUBSCRIPTION: "custrecordzab_cd_subscription",
                ITEM: "custrecordzab_cd_item",
                QUANTITY: "custrecordzab_cd_quantity",
                RATE: "custrecordzab_cd_rate",
                CUSTOMER: "custrecord_scg_count_cus",
                SITE: "custrecord_scg_count_site",
                INITIAL_BILL: "custrecord_scg_count_bill_date_override",
                OLI: "custrecord_scg_count_oli",
                LOCATION: "custrecord_scg_count_loc",
                BILL_TO: "custrecord_scg_cd_bill_override",
                EMAILS: "custrecordscg_cd_inv_email_address_list",
                EMAIL_DELIVERY: "custrecord_scg_cd_email_delivery",
                NEXT_UPLIFT: "custrecord_scg_cd_next_uplift",
                UPLIFT: "custrecord_scg_cd_uplift",
                ASSET: "custrecord_scg_sf_asset",
                AAT: "custrecord_scg_aat_id",
                DO_NOT_BUNDLE: "custrecord_scg_dont_bundle",
                BILL_ADDRESS_OVERRIDE: "custrecord_scg_bill_address_overridee",
                ORIGINAL_END: "custrecord_scg_original_end",
                ORIGINAL_RATE: "custrecord_scg_cd_origin_rate",
                RECURRENCE_COUNT: "custrecord_scg_recurrence_count",
                PARENT_COUNT: "custrecord_scg_parent_count",
                PROCESSED_COUNT: "custrecord_scg_processed_count",
                LAST_PROCESSED: "custrecord_scg_last_process_date",
                FROM_REC: "custrecord_scg_from_record_bg",
                TO_REC: "custrecord_scg_to_record_bg"
            }
        },
        SCG_COUNT: {
            ID: "customrecord_scg_cd_billing",
            Field: {
                COUNT: "custrecord_scg_count_rec_p",
                START_DATE: "custrecord_scg_sc_start",
                END_DATE: "custrecord_scg_sc_end_date",
                SUB: "custrecord_scg_sc_sub"
            }
        },
        ZAB_SUBSCRIPTION_ITEM: {
            ID: "customrecordzab_subscription_item",
            Field: {
                REGEN: "custrecordzab_si_generate_forecast_charg",
                PAID_THROUGH: "custrecord_scg_paid_through",
                PRODUCT: "custrecordzab_si_item",
                CUSTOMER: "custrecordzab_si_customer",
                SUB: "custrecordzab_si_subscription",
                CURRENCY: "custrecordzab_si_currency"
            }
        },
        ZAB_SUBSCRIPTION: {
            ID: "customrecordzab_subscription",
            Field: {
                CUSTOMER: "custrecordzab_s_customer",
                CHARGE_SCHEDULE: "custrecordzab_s_charge_schedule",
                MAX_ARR: "custrecord_scg_max_arr",
                USAGE_NEED: "custrecord_scg_u_detail",
                INVOICE_EMAILS: "custrecordzab_s_inv_email_address_list",
                BILLING_PROFILE: "custrecordzab_s_billing_profile",
                START_DATE: "custrecordzab_s_start_date",
                END_DATE: "custrecordzab_s_end_date",
                EVERGREEN_TERM: "custrecordzab_s_evergreen_months",
                LAST_UPLIFTED: "custrecord_scg_last_uplift_date",
                LAST_UPLIFT_EFFECTIVE: "custrecord_scg_last_change_rate",
                NEXT_ANNIVERSARY: "custrecord_scg_next_anniversary"
            }
        },
        MRI_INSURANCE: {
            ID: "customrecord_scg_insurance_usage",
            Field: {
                INTERNAL_ID: "internalid",
                PRODUCT: "custrecord_scg_i_prod",
                CUSTOMER: "custrecord_scg_i_customer",
                SERVICE_DATE: "custrecord_scg_i_date"
            }
        },
        MRI_SCREENING: {
            ID: "customrecord_scg_mri_screening",
            Field: {
                INTERNAL_ID: "internalid",
                USAGE_DATE: "custrecord_scg_main_date",
                ITEM: "custrecord_scg_prod",
                CLIENT_ID: "custrecord_scg_client_id",
                APP_NAME: "custrecord_scg_app_name"
            }
        },
        USAGE_TYPE: {
            LISTID: "customlist_usagedetail_types",
            VALUES: {
                RHR: 1,
                RESCHECK: 2,
                MFIP: 3,
                CALLMAX: 4
            }
        }
    };

    exports.chargeDataSearch = (dataIn, charges) => {};

    exports.getTransactionType = transactionId => {
        let tranTypeA = search.lookupFields({
            type: search.Type.TRANSACTION,
            id: transactionId,
            columns: "type"
        });
        log.debug({
            title: "TranType",
            details: tranTypeA.type[0].value
        });
        let tranType;
        if (tranTypeA.type[0].value == "SalesOrd") {
            tranType = "salesorder";
        } else if (tranTypeA.type[0].value == "CustInvc") {
            tranType = "invoice";
        } else {
            tranType = "creditmemo";
        }

        return tranType;
    };
    /**
     *
     * @param {object} oldCd
     * @param {object} newCd
     * @param {Object} subFields
     *
     * Sets AAT to and Initial bill date to null
     * Set Start Date to next anniversary from subscription
     * Set End date to +1 Year -1 Day of Start Date unless original is sooner
     * Set last processed date to today
     *
     * @returns {object}
     */
    exports.setCoreCountFields = (oldCd, newCd, subFields) => {
        try {
            const COUNT = exports.RECORD_TYPE.ZAB_COUNT;

            //clear the AAT ID
            newCd.setValue({
                fieldId: COUNT.Field.AAT,
                value: ""
            });
            newCd.setValue({
                fieldId: COUNT.Field.INITIAL_BILL,
                value: null
            });
            let start = new Date(subFields["custrecord_scg_next_anniversary"]);
            newCd.setValue({
                fieldId: COUNT.Field.EFFECTIVE_DATE,
                value: start
            });

            start = moment(start.toDateString());
            let nextUplift = start.clone().add(1, "y");
            newCd.setValue({
                fieldId: COUNT.Field.NEXT_UPLIFT,
                value: new Date(nextUplift)
            });
            let end = nextUplift.clone().subtract(1, "d");

            newCd.setValue({
                fieldId: COUNT.Field.FROM_REC,
                value: oldCd.id
            });

            newCd.setValue({
                fieldId: COUNT.Field.END_DATE,
                value: new Date(end)
            });
            newCd.setValue({
                fieldId: COUNT.Field.OLI,
                value: 6
            });
            newCd.setValue({
                fieldId: COUNT.Field.LAST_PROCESSED,
                value: new Date()
            });

            return newCd;
        } catch (e) {
            log.error({
                title: "ERROR SETTING CD FIELDS",
                details: e
            });
        }
    };
    /**
     *
     * Creates a sub record of Count Data from an object
     *
     * @param data
     * @param data.start {Date} - Start Date of Record
     * @param data.end {Date} - End Date of Record
     * @param data.count {string} - ID of Count Record
     * @param data.sub {string} - ID of Subscription
     * @returns {number} - Internal ID of New Record
     */
    exports.createBillingCountRec = data => {
        const RECORD_TYPE = this.RECORD_TYPE;
        let newRec = record.create({
            type: RECORD_TYPE.SCG_COUNT.ID,
            isDynamic: true
        });
        newRec.setValue({
            fieldId: RECORD_TYPE.SCG_COUNT.Field.COUNT,
            value: data.count
        });
        newRec.setValue({
            fieldId: RECORD_TYPE.SCG_COUNT.Field.START_DATE,
            value: data.start
        });
        newRec.setValue({
            fieldId: RECORD_TYPE.SCG_COUNT.Field.END_DATE,
            value: data.end
        });
        newRec.setValue({
            fieldId: RECORD_TYPE.SCG_COUNT.Field.SUB,
            value: data.sub
        });
        return newRec.save();
    };

    /**
     * Creates biannual charges based on dates
     * @param newCountRecs {object[]}
     */
    exports.createBiannualRecs = newCountRecs => {
        try {
            const COUNT = exports.RECORD_TYPE.ZAB_COUNT;
            newCountRecs.forEach(newCd => {
                //get dates of new count record
                const newCountFields = search.lookupFields({
                    type: COUNT.ID,
                    id: newCd,
                    columns: [
                        "custrecordzab_cd_end_date",
                        "custrecordzab_cd_effective_date",
                        "custrecordzab_cd_subscription"
                    ]
                });
                //get existing end date
                const endOriginal = moment(
                    new Date(newCountFields["custrecordzab_cd_end_date"])
                );
                const effectiveOriginal = moment(
                    new Date(newCountFields["custrecordzab_cd_effective_date"])
                );
                const sub =
                    newCountFields.custrecordzab_cd_subscription[0].value;
                const months = endOriginal.diff(effectiveOriginal, "months");
                log.debug({
                    title: "Months Between",
                    details: months
                });
                if (months >= 5) {
                    //calculate end date for first rec
                    //effective date = original
                    //get original end
                    let end1 = moment(
                        new Date(newCountFields["custrecordzab_cd_end_date"])
                    );
                    const newRec1 = exports.createBillingCountRec({
                        start: new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        ),
                        end: new Date(end1.add(-6, "months")),
                        count: newCd,
                        sub: sub
                    });

                    //add one to first end date to get start
                    let start2 = end1.add(1, "days");
                    const newRec2 = exports.createBillingCountRec({
                        start: new Date(start2),
                        end: new Date(
                            newCountFields["custrecordzab_cd_end_date"]
                        ),
                        sub: sub,
                        count: newCd
                    });
                } else {
                    //Effective date is after end date less 6  months

                    const newRec = THIS.createBillingCountRec({
                        start: new Date(
                            newCountFields["custrecordzab_cd_effective_date"]
                        ),
                        end: new Date(
                            newCountFields["custrecordzab_cd_end_date"]
                        ),
                        count: newCd,
                        sub: sub
                    });
                } //end for each
            });
        } catch (e) {
            log.error({
                title: "Error creating biannual charges",
                details: e
            });
        }
    };

    exports.createQuarterlyRecs = newCountRecs => {};

    return exports;
}); //end define
