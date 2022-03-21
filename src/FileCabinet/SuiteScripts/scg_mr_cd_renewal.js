/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Bobby Brown
 *
 * 9/15/2021 - Converted to SS 2.1
 *
 */

define([
    "N/search",
    "N/record",
    "N/runtime",
    "N/error",
    "N/format",
    "N/query",
    "./Lib/_scg_mri_lib.js",
    "SuiteScripts/Lib/lodash.min",
    "SuiteScripts/Lib/moment.min"
], (search, record, runtime, error, format, query, CONSTANTS, _, moment) => {
    /**
     * @typedef {Object} countRec
     * @property subscription {Number}
     * @property parentCd {Number}
     * @property uplift {Number}
     * @property start_date {Date}
     * @property end_date {Date}
     * @property original_end {Date}
     * @property id {Number}
     * @property rate {Number}
     * @property nextUplift {Date}
     * @property charge_schedule {Number}
     * @property next_anniversary {Date}
     * @property sub_last_uplift {Date}
     * @property sub_last_changed {Date}
     * @property quant1 {Number}
     * @property quant2 {Number}
     * @property quant3 {Number}
     * @property rate1 {Number}
     * @property rate2 {Number}
     * @property rate3 {Number}
     * @property to_rec {String}
     * @property from_rec {String}
     * @property transformed_to_rec {Number} list/record value for to record
     * @property source_recs {Number[]} multi select for records that created this
     */

    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @description Get Input Stage creates search columns and a constant filter for the asset id not being empty
     * If the job is the normal schedule job set filters based on charge schedules
     *
     * @function getInputData
     * @return {Array|Object|Search|ObjectRef} inputSummary
     */
    const getInputData = () => {
        try {
            log.debug({
                title: "START",
                details: "Get Input Data"
            });
            //create search columns
            const seaColumns = [
                search.createColumn({
                    name: "custrecordzab_cd_effective_date"
                }),
                search.createColumn({
                    name: "custrecordzab_cd_end_date"
                }),
                search.createColumn({
                    name: "name"
                }),
                search.createColumn({
                    name: "custrecordzab_cd_subscription"
                }),
                search.createColumn({
                    name: "custrecordzab_cd_item"
                }),
                search.createColumn({
                    name: "custrecordzab_cd_quantity"
                }),
                search.createColumn({
                    name: "custrecordzab_cd_rate"
                }),
                search.createColumn({
                    name: "custrecord_scg_count_cus"
                }),
                search.createColumn({
                    name: "custrecord_scg_count_site"
                }),
                search.createColumn({
                    name: "custrecord_scg_count_loc"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_bill_override"
                }),
                search.createColumn({
                    name: "custrecord_scg_sf_asset"
                }),
                search.createColumn({
                    name: "custrecord_scg_parent_count"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_uplift"
                }),
                search.createColumn({
                    name: "custrecord_scg_processed_count"
                }),
                search.createColumn({
                    name: "custrecord_scg_recurrence_count"
                }),
                search.createColumn({
                    name: "custrecord_scg_original_end"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_next_uplift"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_quant1"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_quant2"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_quant1"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_quant2"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_quant3"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_rate1"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_rate2"
                }),
                search.createColumn({
                    name: "custrecord_scg_cd_rate3"
                }),
                search.createColumn({
                    name: "formulanumeric",
                    formula:
                        "ROUND({custrecordzab_cd_subscription.custrecord_scg_next_anniversary}-{custrecordzab_cd_subscription.custrecordzab_s_end_date})"
                }),
                search.createColumn({
                    name: "formulapercent",
                    formula:
                        "CASE WHEN {custrecordzab_cd_item.custitem_scg_is_uplift} = 'T' THEN {custrecordzab_cd_subscription.custrecord_scg_uplift_p} ELSE 0 END"
                }),
                search.createColumn({
                    name: "custrecord_scg_source_recs"
                }),
                search.createColumn({
                    name: "custrecord_scg_transformed_to"
                })
            ];

            //check parameters
            const scrip = runtime.getCurrentScript();
            //get parameter for redoing renewals
            const redoSubscriptions = scrip.getParameter({
                name: "custscript_scg_reprocess_subscriptions"
            });
            const singleOverride = scrip.getParameter({
                name: "custscript_scg_sub_param"
            });
            if (singleOverride) {
                log.debug({
                    title: "single override",
                    details: singleOverride
                });
                return search.create({
                    type: "customrecordzab_count_data",
                    columns: seaColumns,
                    filters: [
                        [
                            "custrecordzab_cd_subscription",
                            "anyof",
                            singleOverride
                        ],
                        "AND",
                        [
                            "custrecordzab_cd_item.custitem_scg_is_renewable",
                            "is",
                            "T"
                        ],
                        "AND",
                        ["custrecord_scg_sf_asset", "isnotempty", ""],
                        "AND",
                        ["custrecord_scg_transformed_to", "anyof", "@NONE@"]
                    ]
                });
            }

            //non standard jobs
            if (redoSubscriptions) {
                log.audit({
                    title: "OVERRIDE",
                    details: redoSubscriptions
                });
                // const subIds = JSON.parse(redoSubscriptions);
                // let oldCdQuery = query.create({
                //     type: "customrecordzab_count_data"
                // });
                // let assetCondition = oldCdQuery.createCondition({
                //     fieldId: "custrecord_scg_sf_asset",
                //     operator: query.Operator.EMPTY_NOT
                // });
                // let subCondition = oldCdQuery.createCondition({
                //     fieldId: "custrecordzab_cd_subscription",
                //     operator: query.Operator.ANY_OF,
                //     values: subIds
                // });
                // let toRecConditino = oldCdQuery.createCondition({
                //     fieldId: "custrecord_scg_transformed_to",
                //     operator: query.Operator.EMPTY
                // });
                // let itemJoin = oldCdQuery.joinTo({
                //     fieldId: "custrecordzab_cd_item",
                //     target: query.Type.ITEM
                // });
                // let renewCondition = itemJoin.createCondition({
                //     fieldId: "custitem_scg_is_renewable",
                //     operator: query.Operator.IS,
                //     values: true
                // });
                // oldCdQuery.condition = oldCdQuery.and(
                //     assetCondition,
                //     subCondition,
                //     toRecConditino,
                //     renewCondition
                // );
                // oldCdQuery.columns = [
                //     oldCdQuery.createColumn({
                //         fieldId: "custrecord_scg_source_recs",
                //         alias: "source_recs"
                //     })
                // ];

                // let oldCdCollection = oldCdQuery.run().asMappedResults();
                // log.debug(oldCdCollection);
                // // let oldCdIds = oldCdCollection.map(o => {
                // //     return o.source_recs;
                // // });
                let oldCdIds = JSON.parse(redoSubscriptions).map(i =>
                    Number(i)
                );

                log.debug({
                    title: "oldcds",
                    details: oldCdIds
                });

                return search.create({
                    type: "customrecordzab_count_data",
                    columns: seaColumns,
                    filters: [
                        search.createFilter({
                            name: "custrecord_scg_sf_asset",
                            operator: search.Operator.ISNOTEMPTY
                        }),
                        search.createFilter({
                            name: "custitem_scg_is_renewable",
                            join: "custrecordzab_cd_item",
                            operator: search.Operator.IS,
                            values: true
                        }),
                        search.createFilter({
                            name: "internalid",
                            operator: search.Operator.ANYOF,
                            values: oldCdIds
                        })
                    ]
                });
            }

            //standard filters
            const standardSearch = search.load({
                //5 gov
                id: "customsearch_scg_cd_evergreen_2"
            });
            return search.create({
                type: "customrecordzab_count_data",
                columns: seaColumns,
                filters: standardSearch.filters
            });
        } catch (e) {
            //end try
            log.error({
                title: "Get Input Error",
                details: e
            });
        }
    }; //end get input

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     * After parsing search result, lookup needed subscription fields
     * Pull updated uplift from the subscription
     * Write Asset ID as the key with count record details as values
     *
     *
     * @function map
     * @param context {mapReduceContext}- Data collection containing the key/value pairs to process through the map stage
     * @param context.value {searchResult}
     * @param context.key {string}
     *
     * @method context.write
     * @return {void}
     */
    const map = context => {
        try {
            log.debug({
                title: "---- Start map ----",
                details: context
            });
            //parse search result
            const searchResult = JSON.parse(context.value);
            const mapData = searchResult.values;
            /** @type countRec */
            let newCd = {};
            newCd.id = context.key;
            newCd.subscription = mapData.custrecordzab_cd_subscription.value;
            const asset = mapData.custrecord_scg_sf_asset;
            newCd.parentCd = mapData.custrecord_scg_parent_count.value;
            newCd.start_date = mapData.custrecordzab_cd_effective_date;
            newCd.end_date = mapData.custrecordzab_cd_end_date;
            newCd.original_end = mapData.custrecord_scg_original_end;
            newCd.rate = mapData.custrecordzab_cd_rate;
            newCd.nextUplift = mapData.custrecord_scg_cd_next_uplift;
            newCd.quant1 = mapData.custrecord_scg_cd_quant1;
            newCd.quant2 = mapData.custrecord_scg_cd_quant2;
            newCd.quant3 = mapData.custrecord_scg_cd_quant3;
            newCd.rate1 = mapData.custrecord_scg_cd_rate1;
            newCd.rate2 = mapData.custrecord_scg_cd_rate2;
            newCd.rate3 = mapData.custrecord_scg_cd_rate3;
            newCd.transformed_to_rec = mapData.custrecord_scg_transformed_to
                ? mapData.custrecord_scg_transformed_to.value
                : null;
            newCd.source_recs = mapData.custrecord_scg_source_recs;
            // if (newCd.transformed_to_rec && newCd.transformed_to_rec !== "")
            //     record.delete({
            //         type: CONSTANTS.RECORD_TYPE.ZAB_COUNT.ID,
            //         id: newCd.transformed_to_rec
            //     });
            //get subscription uplift percent
            newCd.uplift = mapData.formulapercent;
            //lookup fields from subscription
            let subFields = search.lookupFields({
                //1 gov
                type: CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.ID,
                id: newCd.subscription,
                columns: [
                    "custrecord_scg_next_anniversary",
                    "custrecordzab_s_charge_schedule",
                    "custrecord_scg_last_uplift_date",
                    "custrecord_scg_last_change_rate"
                ]
            });
            // log.debug({
            //     title: "Sub Fields",
            //     details: subFields
            // });
            newCd.charge_schedule =
                subFields.custrecordzab_s_charge_schedule[0].value;
            newCd.next_anniversary =
                subFields["custrecord_scg_next_anniversary"];
            newCd.sub_last_uplift =
                subFields["custrecord_scg_last_uplift_date"];
            newCd.sub_last_changed =
                subFields["custrecord_scg_last_change_rate"];
            log.debug({
                title: "WRITE OUT OF MAP",
                details: newCd
            });

            context.write({
                key: asset,
                value: newCd
            });
        } catch (e) {
            log.error({
                title: "Error in map",
                details: e
            });
        }
    }; //end map
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     * Count records grouped by Asset ID are passed in.
     * Creates a new count record for the next year with uplift applied if applicable
     *
     *
     *
     * @function reduce
     * @param context {ReduceContext} Data collection containing the groups to process through the reduce stage
     * @param context.key - {String} ID of asset
     * @param context.values {countRec[]} Count records to be reduced
     * @return {void}
     */
    const reduce = context => {
        log.debug({
            title: "START REDUCE",
            details: context
        });
        // initialize the new record
        let newCd;
        let resultId;
        let subFields = {};
        const COUNT = CONSTANTS.RECORD_TYPE.ZAB_COUNT;
        //check if restarted
        let alreadyProcessed = false;
        if (context.isRestarted) {
            alreadyProcessed = true;
            log.audit({
                title: "Reduce stage is being restarted",
                details: context.key
            });
        }

        //parse all context values into an array of objects
        //filter out any already processed values
        /**
         *
         * @type {countRec[]}
         */
        let countDataRecs = [];
        _.forEach(context.values, o => {
            if (alreadyProcessed) {
                let countRec = JSON.parse(o);
                let check = search.lookupFields({
                    //1 gov
                    type: COUNT.ID,
                    id: countRec.id,
                    columns: ["custrecord_scg_last_process_date"]
                });
                let today = new Date();
                today = today.toDateString();
                let lastProcessed = new Date(
                    check["custrecord_scg_last_process_date"]
                );
                lastProcessed = lastProcessed.toDateString();
                if (today !== lastProcessed) {
                    countDataRecs.push(countRec);
                }
            } else {
                countDataRecs.push(JSON.parse(o));
            }
        });
        // array for record IDs that are being transformed
        let transformedRecIds = countDataRecs.map(c => c.id);

        log.debug({
            title: "Asset: " + context.key,
            details: "AATs: " + context.values.length
        });
        let oldCd;
        let sortedCds;
        if (countDataRecs.length === 1) {
            oldCd = countDataRecs[0];
        } else {
            //sort count records by start date
            sortedCds = _.sortBy(countDataRecs, ["start_date"], ["asc"]);
            oldCd = sortedCds[0];
        }

        // copy source record
        // 2 gov
        newCd = record.copy({
            type: COUNT.ID,
            id: oldCd.id,
            isDynamic: true
        });
        newCd.setValue({
            fieldId: COUNT.Field.PARENT_COUNT,
            value: oldCd.id
        });
        // multi select field
        newCd.setValue({
            fieldId: "custrecord_scg_source_recs",
            value: transformedRecIds
        });

        subFields["custrecord_scg_next_anniversary"] = oldCd.next_anniversary;
        newCd = CONSTANTS.setCoreCountFields(oldCd, newCd, subFields);
        if (countDataRecs.length === 1) {
            //get uplift percent from original aat
            let upliftPercent = parseFloat(oldCd.uplift);
            // log.debug({
            //     title: "Uplift",
            //     details: upliftPercent
            // });

            //compare next uplift date to today
            let compare = moment(oldCd.next_anniversary);
            let nextUpliftDate = moment(oldCd.nextUplift);

            if (
                upliftPercent > 0 &&
                compare.get("y") === nextUpliftDate.get("y")
            ) {
                let newRate =
                    (upliftPercent / 100 + 1) * parseFloat(oldCd.rate);
                newCd.setValue({
                    fieldId: COUNT.Field.RATE,
                    value: newRate
                });
            }
            //save new rec
            //set to record and last processed on old rec
            resultId = newCd.save(); //4 gov
            record.submitFields({
                //2 gov
                type: COUNT.ID,
                id: oldCd.id,
                values: {
                    custrecord_scg_transformed_to: resultId,
                    custrecord_scg_last_process_date: new Date()
                }
            });
        } //end single record process
        else {
            //loop through subsequent records and set parent count record
            for (let e = 1; e < sortedCds.length; e++) {
                record.submitFields({
                    //2 gov
                    type: COUNT.ID,
                    id: sortedCds[e].id,
                    values: {
                        custrecord_scg_parent_count: oldCd.id
                    }
                });
            } //end for loop
            //get uplift percent from parent asset transaction
            let upliftPercent = parseFloat(oldCd.uplift);
            log.debug({
                title: "Uplift",
                details: upliftPercent
            });

            //calculate new rate
            let sumRate = _.sumBy(countDataRecs, cd => {
                //check next uplift date
                let tempRate = parseFloat(cd.rate);

                //compare next uplift date to today
                let compare = moment(cd.next_anniversary);
                let cdNextUpliftDate = moment(cd.nextUplift);

                //apply uplift if applicable
                if (
                    upliftPercent > 0 &&
                    compare.isSameOrAfter(cdNextUpliftDate)
                ) {
                    tempRate = (upliftPercent / 100 + 1) * tempRate;
                }

                return tempRate;
            });

            let q1_old = Number(
                newCd.getValue({
                    fieldId: "custrecord_scg_cd_quant1"
                })
            );
            let q2_old = Number(
                newCd.getValue({
                    fieldId: "custrecord_scg_cd_quant2"
                })
            );
            let q3_old = Number(
                newCd.getValue({
                    fieldId: "custrecord_scg_cd_quant3"
                })
            );
            if (q1_old) {
                let newQuant1 = _.sumBy(countDataRecs, c => {
                    return Number(c.quant1);
                });
                newCd.setValue({
                    fieldId: "custrecord_scg_cd_quant1",
                    value: newQuant1
                });
            }
            if (q2_old) {
                let newQuant2 = _.sumBy(countDataRecs, c => {
                    return Number(c.quant2);
                });
                newCd.setValue({
                    fieldId: "custrecord_scg_cd_quant1",
                    value: newQuant2
                });
            }
            if (q3_old) {
                let newQuant3 = _.sumBy(countDataRecs, c => {
                    return Number(c.quant3);
                });
                newCd.setValue({
                    fieldId: "custrecord_scg_cd_quant1",
                    value: newQuant3
                });
            }
            let r1_old = Number(
                newCd.getValue({
                    fieldId: "custrecord_scg_cd_rate1"
                })
            );
            let r2_old = Number(
                newCd.getValue({
                    fieldId: "custrecord_scg_cd_rate2"
                })
            );
            let r3_old = Number(
                newCd.getValue({
                    fieldId: "custrecord_scg_cd_rate3"
                })
            );
            if (r1_old) {
                let newRate1 = _.sumBy(countDataRecs, c => {
                    return Number(c.rate1);
                });
                newCd.setValue({
                    fieldId: "custrecord_scg_cd_rate1",
                    value: newRate1
                });
            }
            if (r2_old) {
                let newRate2 = _.sumBy(countDataRecs, c => {
                    return Number(c.rate2);
                });
                newCd.setValue({
                    fieldId: "custrecord_scg_cd_rate2",
                    value: newRate2
                });
            }
            if (r3_old) {
                let newRate3 = _.sumBy(countDataRecs, c => {
                    return Number(c.rate3);
                });
                newCd.setValue({
                    fieldId: "custrecord_scg_cd_rate1",
                    value: newRate3
                });
            }

            log.debug({
                title: "summed rate",
                details: sumRate
            });

            //set new rate
            newCd.setValue({
                fieldId: COUNT.Field.RATE,
                value: sumRate
            });

            resultId = newCd.save(); // 4 gov
            //assign TO record for all associated records
            _.forEach(sortedCds, cd => {
                if (cd.id) {
                    record.submitFields({
                        //2 gov
                        type: COUNT.ID,
                        id: cd.id,
                        values: {
                            custrecord_scg_transformed_to: resultId,
                            custrecord_scg_last_process_date: new Date()
                        }
                    });
                }
            });
        } //end multi record processing

        //get existing next anniversary date
        let d = new Date(subFields["custrecord_scg_next_anniversary"]);
        //add one year
        d.setFullYear(d.getFullYear() + 1);
        //convert back to date
        let nextAnn = new Date(d);
        log.debug({
            title: "Next Anniversary Date",
            details: nextAnn
        });

        // //Processing for Quarterly and biannual bills
        // log.debug({
        //     title: "Charge Schedule",
        //     details: countDataRecs[0].charge_schedule
        // });
        //
        // let per_year_bills = search.lookupFields({
        //     type: "customrecordzab_charge_schedules",
        //     id: countDataRecs[0].charge_schedule,
        //     columns: ["custrecord_scg_bill_frequency"]
        // });
        // per_year_bills = per_year_bills["custrecord_scg_bill_frequency"];
        //
        // //process biannual charges
        // if (per_year_bills === 2) {
        //     log.debug("Biannual Start");
        // } else if (per_year_bills === 4) {
        //     //process quarterly charges
        //     log.debug("Quarterly Start");
        // }
        log.debug({
            title: "Context to write",
            details: {
                subscription: countDataRecs[0].subscription,
                nextAnn: nextAnn.toDateString(),
                last_change: new Date(
                    subFields["custrecord_scg_next_anniversary"]
                ).toDateString()
            }
        });

        //write to summary
        context.write({
            key: JSON.stringify({
                subscription: countDataRecs[0].subscription,
                nextAnn: nextAnn.toDateString(),
                last_change: new Date(
                    subFields["custrecord_scg_next_anniversary"]
                ).toDateString()
            }),
            value: JSON.stringify({
                newId: resultId,
                oldId: transformedRecIds,
                uplift: oldCd.uplift
            })
        });
    };

    /**
     * @function summarize
     * @param summary
     * @param summary.inputSummary
     * @param summary.mapSummary
     * @param summary.reduceSummary
     * @param summary.output
     * @param summary.isRestarted {boolean}
     * @param summary.seconds - Script run time
     * @param summary.yields - Number of yields
     *
     */
    const summarize = summary => {
        let mapErrors = [];
        let reduceErrors = [];
        // For each error thrown during the map stage, log the error, the corresponding key,
        // and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summary.mapSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
                log.error({
                    title:
                        "Map error for key: " +
                        key +
                        ", execution no.  " +
                        executionNo,
                    details: error
                });
                mapErrors.push({ asset: key, message: error, stage: "map" });
                return true;
            });

        // For each error thrown during the reduce stage, log the error, the corresponding
        // key, and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summary.reduceSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
                log.error({
                    title:
                        "Reduce error for key: " +
                        key +
                        ", execution no. " +
                        executionNo,
                    details: error
                });
                reduceErrors.push({
                    asset: key,
                    message: error,
                    stage: "reduce"
                });
                return true;
            });
        log.debug({ title: "MAP ERRORS", details: mapErrors });
        log.debug({ title: "REDUCE ERRORS", details: reduceErrors });
        if (summary.isRestarted) {
            log.audit("Summary Stage is being Restarted");
        }
        let countRes = {};
        let subsToProcess = [];
        let totalProcessed = 0;
        summary.output.iterator().each((key, value) => {
            log.debug({ title: key, details: value });
            totalProcessed += 1;
            const fields = JSON.parse(key);
            subsToProcess.push(fields);
            if (countRes.hasOwnProperty(fields.subscription)) {
                countRes[fields.subscription].push(JSON.parse(value));
            } else {
                countRes[fields.subscription] = [JSON.parse(value)];
            }
            return true;
        });
        log.debug({
            title: "SUBS TO GO",
            details: subsToProcess
        });
        log.debug({
            title: "Countres",
            details: countRes
        });
        let uniqSubs;
        let uniqSubSet = new Set();
        const filteredArr = subsToProcess.filter(obj => {
            const isPresent = uniqSubSet.has(obj.subscription);

            uniqSubSet.add(obj.subscription);

            return !isPresent;
        });

        log.audit({
            title: `SUMMARIZING SUBSCRIPTIONS: ${filteredArr.length}`
        });

        //set fields on subscription for summary processing
        // 8 governance units per subscription
        _.forEach(filteredArr, subString => {
            const fields = subString;

            log.debug(fields, countRes[fields.subscription]);

            const subId = fields.subscription;
            const recs = countRes[subId];
            let uplifts = _.uniq(
                recs.map(x => {
                    let temp = parseFloat(x.uplift);
                    if (typeof temp === "number" && temp > 0) return temp;
                })
            );
            log.debug(uplifts);
            // const newRecs = recs.map(x => x.newId);
            let processJob = record.create({
                //2 gov
                type: "customrecord_scg_renewal_process",
                isDynamic: true
            });
            processJob.setValue({
                fieldId: "custrecord_scg_res_json",
                value: JSON.stringify(recs)
            });
            processJob.setValue({
                fieldId: "custrecord_scg_pr_sub",
                value: subId
            });
            processJob.setValue({
                fieldId: "custrecord_scg_p_last_effective",
                value: new Date(fields.last_change)
            });

            if (uplifts[0])
                processJob.setValue({
                    fieldId: "custrecord_scg_uplift_process",
                    value: uplifts[0]
                });
            const pjId = processJob.save(); // 4 gov
            log.debug("JOB", pjId);
            let subResults = record.submitFields({
                //2 gov
                type: CONSTANTS.RECORD_TYPE.ZAB_SUBSCRIPTION.ID,
                id: fields.subscription,
                values: {
                    custrecord_scg_last_uplift_date: new Date(),
                    custrecord_scg_uplift_log: pjId,
                    custrecord_scg_next_anniversary: new Date(fields.nextAnn)
                }
            });
        });

        log.audit({
            title: "Created " + totalProcessed + " Count records",
            details:
                "Time(in seconds): " +
                summary.seconds +
                " with " +
                summary.yields +
                " yields"
        });
    }; //end summary

    return {
        config: {
            exitOnError: false
        },

        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}); //end
