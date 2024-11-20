"use client"

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { redirect } from "next/navigation";

import { createClient } from '@/utils/supabase/client';
import { get_result_for_id } from '@/utils/data_fetch';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Form from './Form';
import ResultsVideoUI from "@/components/ResultVideoUI";
import ResultsAudioUI from "@/components/ResultAudioUI";

const VideoAnalysisForm = ({ user }) => {
    const [user_data, set_user_data] = useState(user);
    const [response_data, set_res_data] = useState({ got_result: false });
    const [id, set_id] = useState("");

    const get_formatted_result = (data, input) => {

        let formatted_result = {
            "results": {
                "frameCheck": undefined,
                "audioAnalysis": undefined
            },
            "analysis_types": input["analysis_types"]
        }

        formatted_result["results"]["frameCheck"] = data["results"]["frame"]["models_results"][0]
        formatted_result["results"]["audioAnalysis"] = data["results"]["audio"]["models_results"][0]
        
        return formatted_result;
    }

    useEffect(() => {
        // we have a ID subscribe to its updates for result
        if (id !== '') {
            const supabase = createClient();
            console.log("subscribed to table changes ")
            const channel = supabase.channel('schema-db-changes')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'Transactions'
                    },
                    async (payload) => {
                        console.log("an update change in db");
                        console.log("update", payload);

                        let resp = await get_result_for_id(id);
                        let formatted_result = get_formatted_result(JSON.parse(resp.models_responses), resp.input_request);
                        resp.result = formatted_result;
                        resp.got_result = true
                        set_res_data(resp);
                        console.log(await supabase.removeChannel(channel));
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }

    }, [id])

    const handle_newCheck = () => {
        set_res_data({ got_result: false });
    }

    const handle_cross_message = () => {
        set_res_data({ got_result: false });
    }

    return (
        <div className="min-h-screen">

            <Navbar user_data={user_data} />
            {/* ERROR OCCURED IN GETTING USER */}
            {
                user.error !== undefined &&
                <div className=" min-h-[94vh] flex flex-col mx-20 py-32 items-center ">
                    <div className=" w-full text-2xl bg-red-400 px-3 rounded-t">
                        ERROR:
                    </div>
                    <div className=" bg-red-300 w-full px-3 text-xl pb-3 pt-2 rounded-b ">
                        {user.error}
                        <br />
                        <div className=" text-base pt-3">
                            contact to report this issue
                        </div>
                    </div>
                </div>
            }
            {
                user.error === undefined &&
                < div className=" bg-white  px-10 min-h-[94vh] pt-16 pb-10 ">
                    {/* SHOW FORM */}
                    {
                        !response_data.got_result &&
                        <>
                            <h2 className=" w-full text-3xl font-semibold px-6 pt-3 py-6">Media Manipulation Detection</h2>
                            <Form
                                user_data={user_data}
                                set_user_data={set_user_data}
                                set_res_data={set_res_data}
                                set_id={set_id}
                            />
                        </>
                    }
                    {/* SHOW RESULT */}
                    {
                        response_data.got_result &&
                        <>
                            {
                                response_data["input_request"]["upload_type"] === "video" &&

                                <ResultsVideoUI
                                    response_data={response_data["result"]["results"]}
                                    fileUrl={response_data["signedUrl"]}
                                    file_metadata={response_data["file_metadata"]}
                                    analysisTypes={response_data["result"]["analysis_types"]}
                                    handle_newCheck={handle_newCheck}
                                />
                            }
                            {
                                response_data["input_request"]["upload_type"] === "audio" &&

                                <ResultsAudioUI
                                    response_data={{
                                        "audioAnalysis": response_data["result"]["results"]["audioAnalysis"],
                                    }}
                                    fileUrl={response_data["signedUrl"]}
                                    file_metadata={response_data["file_metadata"]}
                                    handle_newCheck={handle_newCheck}
                                />
                            }
                        </>
                    }
                </div>
            }
            {/* SHOW ERROR related pop-up messages */}
            {
                response_data.message !== undefined
                &&
                <>
                    {/* MESSAGES (ERRORS) */}
                    <div className=' fixed right-6 bottom-16 z-10 '>

                        <div className=' flex flex-col items-end rounded-lg h-24 w-52 border-2 border-gray-300  bg-white px-3 py-2 '>

                            <svg onClick={handle_cross_message} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className=" absolute cursor-pointer size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>

                            <div className=' w-full flex flex-col gap-2'>
                                <div className=' underline underline-offset-2'>Message:</div>
                                <div>
                                    {response_data.message}
                                </div>
                            </div>
                        </div>

                    </div>
                </>
            }.
            <Footer />
        </div >
    );
};

export default VideoAnalysisForm;