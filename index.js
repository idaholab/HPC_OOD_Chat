// Copyright 2024, Battelle Energy Alliance, LLC, ALL RIGHTS RESERVED
// Open OnDemand Stream Chat
// Brandon Biggs - INL HPC
// Last Updated: 20240617
// Version: 0.7.0

var support_email = ""
var chat_avatar_url = "https://api.dicebear.com/5.x/bottts/svg?seed=12"
var info_display_text = `Thanks for exploring the HPC AI Chatbot. This system is currently in beta. If you have any questions or concerns, please email us at <a href="mailto:${support_email}">${support_email}</a> or fill out our <a href="#" id="feedback_form_link">feedback form</a>.`

// These are vector databse options. For our instance we used qdrant
var score_threshold = 0.4;
var vector_store = "qdrant"
var vector_db = "";
var result_count = 3;
var VDB_URL = "";

// LLM API Key/Model
var service_user = ""
var llm_model = "Mistral-7B-Instruct-v0.2"
var LLM_URL = "";

const date = new Date();
let day = date.getDate();
let month = date.getMonth();
let year = date.getFullYear();
var today = date.toLocaleDateString("en-US", {year: 'numeric', month: 'long', day: 'numeric'});

var prompt = `You are an assistant to a High Performance Computing (HPC) organization. You are a helpful, respectful and honest AI assistant. You will be replying to an HPC user. Always respond in a neutral tone, being polite and courteous. Ensure that your responses are socially unbiased and positive in nature. If a question does not make sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information. Respond in 1-2 complete sentences, unless specifically asked by the user to elaborate on something. Use History and Context to inform your answers but don't provide the history and context to the user. Today's date is ${today}`;

var waiting = false;
var conversation = {'conversation': []};
var hostname = window.location.hostname;
var dev_hostname = "";

// The order of these really matter.
var predetermined_ai_messages = [
    "Hi! I'm an HPC AI. Unfortunately chat seems to be down. We will work to get this resolved ASAP!",
    `Hi! I'm an HPC AI developed by an HPC team. I'm still in beta, so you may see some weird behavior. Please report issues to ${support_email} so this service can be improved. I was last updated on June 17th 2024.`,
    "Thank you for the feedback."
]

$(document).ready(function() {
    // OOD 1.8
    // var username = $("p.navbar-text").data()['content'].replace('Logged in as ','');
    // OOD 3.1
    var username = $('.nav-item[data-content*="Logged in as"').text().replace('Logged in as ','').trim();

    $(".chat_avatar").prepend(`<img src="${chat_avatar_url}"/>`)

    if (hostname === dev_hostname){
        dev_tools();
    }
    $('.fabs').hide()
    var api_status = true;
    
    $.get({
        url: `${LLM_URL}/`,
        type: "GET",
        success: function(data){
            console.log("API is reachable.");
            api_status = true;
        },
        error: function(e) {
            console.log("API is not reachable.");
        },
    }).done(function(data)
    {
        if (api_status){
            $("#info-display").append(info_display_text);
            $("head").append(`<script type="module" src="https://md-block.verou.me/md-block.js"/>`);
            $('.fabs').show();
            showInitialChatIntro();  
            conversation['conversation'].push({
                "role": "system", 
                "content": prompt
            });
            sessionStorage.hpc_chat = JSON.stringify(conversation);          
            setupInitialChat();
        }
        else {
            addAIMessage(predetermined_ai_messages[0], "", []);
            disableChat();
            changeChatDisplay("basic_chat");
            $('#chat_feedback_loader').hide();
        }
    });
    
    // Setup initial chat
    function setupInitialChat(){
        addAIMessage(predetermined_ai_messages[1], "", []);
        $("#chat_converse").append(`
        <span class="chat_msg_item chat_msg_item_admin">
            <div class="chat_avatar">
                <img src="${chat_avatar_url}"/>
            </div>
            Try asking me about
            <ul class="tags">
                <li id="suggestion-button-system1">System1</li>
                <li id="suggestion-button-system2">System2</li>
            </ul>
        </span>
        `)

        //  If the key is in sessionStorage, we update the conversation to show what has been previously said
        if ("hpc_chat" in sessionStorage){
            hpc_chat = JSON.parse(sessionStorage.hpc_chat);
            jsonToConversation(hpc_chat);
        } 
        // If the key isn't in sessionStorage, we add the first conversation piece from the AI
        else {

        }
        // This shows the proper form in the chat that we want to see.
        enableChat();
        changeChatDisplay("basic_chat");
    }

    function showInitialChatIntro(){
        if ("hpc_chatbox_intro" in localStorage){
            $("#bot_hello").hide();
        }
        else {
            $('#bot_hello').fadeIn('medium');
            $("#bot_hello").delay(10000).fadeOut('medium');
        }
    }

    function hideChatIntro(){
        $("#bot_hello").hide();
        localStorage.hpc_chatbox_intro = "";
    }

    // Add user message to chat and sessionStorage
    function addUserMessage(user_message, chat_history){
        // user_message: (str) What the user puts into the chat box
        // chat_history: (bool) We don't want to recreate the conversation history in session storage if we're just repopulating history from storage 
        var dt = new Date();
        var time = dt.getHours() + ":" + dt.getMinutes().toString().padStart(2, '0');
        $("#chat_converse").append(`
            <span class="chat_msg_item chat_msg_item_user">
                ${user_message}
            </span>
            <!--<span class="status-above-chat">User ${time}</span>-->
        `);
        $("#chatSend").val('')
        if (!chat_history){
            conversation['conversation'].push({
                "role": "user", 
                "content": user_message
            })
            sessionStorage.hpc_chat = JSON.stringify(conversation)
        }
    }

    // Adds an AI message to chat and sessionStorage
    function addAIMessage(ai_message, context, sources){
        var source_attachment = ""
        // var sources_list = sources;
        if (context){
            source_attachment = `
            <li class="zmdi zmdi-attachment-alt">
                <div class="popup">
                    <span class="popuptext">Sources:<br>${sources_list}</span>
                </div>
            </li>`
        }
        var feedbackList = `
            <ul class="tags">
                <li class="zmdi zmdi-thumb-up"></li>
                <li class="zmdi zmdi-thumb-down"></li>
                ${source_attachment}
            </ul>
            <p style="display: none">${context}</p>`;
        if (predetermined_ai_messages.includes(ai_message)){
            feedbackList = "";
        }
        $("#chat_converse").append(`
            <span class="chat_msg_item chat_msg_item_admin">
                <div class="chat_avatar">
                    <img src="${chat_avatar_url}"/>
                </div>
                <md-block class="md-block-content">${ai_message}</md-block>
                ${feedbackList}
            </span>
        `);
    }

    // Takes the sessionStorage conversation and displays it to the screen
    function jsonToConversation(conversation){
        conversation['conversation'].forEach((message) => {
            if (message['role'] === 'assistant' ){
                // addAIMessage(message['content'], message["ai-context"], message['ai-sources'])
                addAIMessage(message['content'], "", [])
            }
            else if (message['role'] === 'user'){
                addUserMessage(message['content'], true)
            }
        })
    }

    function changeChatDisplay(chatDisplay) {
        $('.chat').show();
        $('#chat_fullscreen').css('display', 'none');
        switch (chatDisplay) {
            // Default chat... what we want usually
            case "basic_chat":
                $('#chat_converse').css('display', 'block');
                
                $('#information_converse').css('display', 'none');
                $('#chat_body').css('display', 'none');
                $('#chat_form').css('display', 'none');
                $('.chat_login').css('display', 'none');
                $('.chat_fullscreen_loader').css('display', 'block');
                break;
            // This shows the form that we could use for reporting/feedback
            case "form_chat":
                $('#chat_form').css('display', 'block');

                $('#chat_converse').css('display', 'none');
                $('#information_converse').css('display', 'none');
                $('#chat_body').css('display', 'none');
                $('.chat_login').css('display', 'none');
                $('.chat_fullscreen_loader').css('display', 'block');
                break;
            // This is the informational chat display
            case "information":
                $('#chat_converse').css('display', 'none');
                $('#information_converse').css('display', 'block');
                $('#chat_body').css('display', 'none');
                $('#chat_form').css('display', 'none');
                $('.chat_login').css('display', 'none');
                $('.chat_fullscreen_loader').css('display', 'block');
                // $('#chat_fullscreen').css('display', 'none');
                break;
            // This is like a few buttons on the screen. We could use this to report?
            case "example_features":
                $('#chat_converse').css('display', 'none');
                $('#information_converse').css('display', 'none');
                $('#chat_body').css('display', 'block');
                $('#chat_form').css('display', 'none');
                $('.chat_login').css('display', 'none');
                $('.chat_fullscreen_loader').css('display', 'block');
                break;
        }
    }

    function disableChat(){
        $("#chatSend").css("opacity", 0)
        $("#fab_send").css("opacity", 0)
    }

    function enableChat(){
        $("#chatSend").css("opacity", 1)
        $("#fab_send").css("opacity", 1)
    }

    function delete_loading_message(){
        $("#chat_converse > .chat_msg_item > .md-block-content:contains('Computing response')").parent().remove();
    }

    function send_message(){
        var user_message = $("#chatSend").val();
        if (user_message !== ''){
            addUserMessage(user_message, false);
            addAIMessage("Computing response...", "", []);
            try{
                get_api_ai_response(user_message);
            }catch (error) {
                console.log(error);
                delete_loading_message();
                addAIMessage("Sorry, something went wrong. We'll try to fix this as soon as possible.", "", []) 
            }
        }
    }

    function provide_feedback(object, feedback, context, sources){
        var input_message = $(object).parent().parent().prevAll(".chat_msg_item_user").html().trim();
        var output_message = $(object).parent().parent().children("md-block").html().trim();
        var feedback = JSON.stringify({
            "input_message": input_message,
            "output_message": output_message,
            "context": context,
            "context_sources": sources,
            "feedback_vote": feedback,
            "feedback_message": "",
            "model_name": llm_model,
            "username": username,
            "prompt": prompt,
            "vector_db": vector_db
        });

        $.post({
            url: `${LLM_URL}/message_feedback`,
            type: "POST",
            data: feedback,
            headers: {
                "Authorization": `Bearer ${service_user}`
            },
            contentType: 'application/json',
            cache: false,
            processData:false,
            success: function(data){
                var i = 0;
                while (i < 10){
                    i = i+1;
                    if (!waiting){
                        addAIMessage(data['message'], "", []);
                        break
                    }
                    setTimeout(function (){
                    }, 2000);
                }
            },
            error: function(e) {
                console.log("Error providing feedback.")
                console.log(e);
            },
        }).done(function(data)
        {
        }); 
    }

    function get_api_ai_response(user_message){
        waiting = true;
        var context = "";
        var sources = "";
        var vdb_query = `${user_message}`
        
        var data = JSON.stringify({
            "query": vdb_query,
            "prompt": "",
            "vector_db_name": vector_db,
            "embedding_model": "all-MiniLM-L6-v2",
            "similar_results_count": result_count,
            "score_threshold": score_threshold,
            "username": username,
        });

        $.post({
            url: `${VDB_URL}/search_vdb`,
            type: "POST",
            data: data,
            contentType: 'application/json',
            cache: false,
            processData:false,
            success: function(data){
                context = data['related_docs'].join('\n');
                sources = data['sources'];
            },
            error: function(e) {
                console.log("error");
                console.log(e);
                context = ""
                sources = ""
                call_llm("", user_message)
            },
        }).done(async function(data){
            call_llm(context, user_message)
        });
    }

    async function call_llm(context, user_message){
        ai_output = "";
        conversation['conversation'][0] = {
            "role": "system", 
            "content": `${prompt}`
        };
        if (context != ""){
            conversation['conversation'].pop();
            conversation['conversation'].push({
                "role": "user", 
                "content": `<KNOWLEDGE>${context}<KNOWLEDGE>\nUSER: ${user_message}`
            });
        }
        try {
            const response = await fetch(`${LLM_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${service_user}`,
                },
                body: JSON.stringify({
                    model: llm_model,
                    temperature: 0.2,
                    messages: conversation['conversation'],
                    stream: true,
                    user: username
                }),
            });
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
        
            // Read the response as a stream of data
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                const chunk = decoder.decode(value);
                const line = chunk

                parsedLine = line.replace(/^data: /, "").trim();
                try{
                    if (parsedLine.includes("[DONE]")){
                        continue
                    }
                    else{
                        parsedLine = JSON.parse(parsedLine)
                        const { choices } = parsedLine;
                        const { delta } = choices[0];
                        const { content } = delta;
                        
                        if (content) {
                            ai_output += content;
                            $("#chat_converse > .chat_msg_item:last > .md-block-content:last")[0].mdContent = ai_output;
                            $("#chat_converse").scrollTop($("#chat_converse")[0].scrollHeight);
                        }
                    }
                }
                catch(e) {
                    continue
                }
            }
        } 
        catch(e) {
            $("#chat_converse > .chat_msg_item:last > .md-block-content:last")[0].mdContent = "Sorry, something went wrong. The conversation might be too long. Please use the refresh button at the top of the chat box to restart the conversation.";
            $("#chat_converse").scrollTop($("#chat_converse")[0].scrollHeight);
        }
        waiting = false;
        conversation['conversation'].pop();
        conversation['conversation'].push({
            "role": "user", 
            "content": `${user_message}`
        });
        conversation['conversation'].push({
            "role": "assistant",
            "content": ai_output.trim(),
            // "ai-context": context,
            // 'ai-sources': sources,
        }); 
        sessionStorage.hpc_chat = JSON.stringify(conversation);
        // console.log(JSON.parse(sessionStorage.hpc_chat))          
    }

    function toggle_clickable_background(){
        if ($(".chat").css("pointer-events") === "none"){
            $(".chat").css("pointer-events", "auto");
        }
        else {
            $(".chat").css("pointer-events", "none");
        }
    }

    function dev_tools(){
        sessionStorage.clear();
        localStorage.clear();
    }

    function chat_bubble_press(obj){
        $(obj).css("background-color", "#07519E");
        $(obj).css("color", "white");
    }

    // button handler for dynamic attachments list
    $(document).on("click", '.zmdi-attachment-alt', function(e){
        $(this).find(".popuptext").toggleClass("show");
    });

    // click handler for thumbs up/thumbs down
    $(document).on("click", ".zmdi-thumb-up", function(e){
        var context = $(this).parent().parent().find('p:last').text();
        if (context){
            var sources = $(this).parent().parent().find('.popuptext').html()
            provide_feedback(this, "like", context, sources);
        } 
        else {
            provide_feedback(this, "like", "", "");
        }
        chat_bubble_press(this);
    });

    $(document).on("click", ".zmdi-thumb-down", function(e){
        var context = $(this).parent().parent().find('p:last').text();
        if (context){
            var sources = $(this).parent().parent().find('.popuptext').html()
            provide_feedback(this, "dislike", context, sources);
        } 
        else {
            provide_feedback(this, "dislike", "", "");
        }
        chat_bubble_press(this);
    });

    // Example systems
    $(document).on("click", "#suggestion-button-system1", function(e){
        $("#chatSend").val("Tell me about System1");
        send_message();
        chat_bubble_press(this);
    });

    $(document).on("click", "#suggestion-button-system2", function(e){
        $("#chatSend").val("Tell me about System2");
        send_message();
        chat_bubble_press(this);
    });

    // This is the button that displays/hides chat that hangs out in the bottom right of the screen
    $('#prime').click(function() {
        toggle_clickable_background();
        hideChatIntro();
        $('.prime').toggleClass('zmdi-comment-outline');
        $('.prime').toggleClass('zmdi-close');
        $('.prime').toggleClass('is-active');
        $('.prime').toggleClass('is-visible');
        $('#prime').toggleClass('is-float');
        $('.chat').toggleClass('is-visible');
        $('.fab').toggleClass('is-visible');
    });

    $('#close_popup').click(function() {
        toggle_clickable_background();
        hideChatIntro();
        $('.prime').toggleClass('zmdi-comment-outline');
        $('.prime').toggleClass('zmdi-close');
        $('.prime').toggleClass('is-active');
        $('.prime').toggleClass('is-visible');
        $('#prime').toggleClass('is-float');
        $('.chat').toggleClass('is-visible');
        $('.fab').toggleClass('is-visible');
    });

    // This is so you can hit enter when in the chatbox
    $("#chatSend").keypress(function (e) {
        var code = (e.keyCode ? e.keyCode : e.which);
        if (code == 13) {
            e.preventDefault();
            send_message();
        }
    });

    // Default send button
    $("#fab_send").click(function() {
        send_message();
    });

    // Event handler for the info button
    $('#chat_info_loader').click(function(e) {
        changeChatDisplay("information");
        disableChat();
    });

    // Event handler for the feedback (comment) button
    $('#chat_feedback_loader').click(function(e) {
        changeChatDisplay("form_chat");
        disableChat();
    });

    $("#feedback_form_link").click(function(e) {
        changeChatDisplay("form_chat");
        disableChat();
    });

    // Event handler for the feedback (comment) button
    $('#chat_reset_loader').click(function(e) {
        conversation['conversation'] = [];
        sessionStorage.removeItem("hpc_chat");
        conversation['conversation'].push({
            "role": "system", 
            "content": prompt
        })
        sessionStorage.hpc_chat = JSON.stringify(conversation);   
        $('#chat_converse').empty();
        setupInitialChat();
    });

    // Event handler for the feedback (comment) button
    $('#close_hello_window').click(function(e) {
        hideChatIntro();
    });

    // Event handler for full screen button
    $('#chat_fullscreen_loader').click(function(e) {
        $('.fullscreen').toggleClass('zmdi-window-maximize');
        $('.fullscreen').toggleClass('zmdi-window-restore');
        $('.chat').toggleClass('chat_fullscreen');
        $('.fab').toggleClass('is-hide');
        $('.header_img').toggleClass('change_img');
        $('.img_container').toggleClass('change_img');
        $('.chat_header').toggleClass('chat_header2');
        $('.fab_field').toggleClass('fab_field2');
        $('.chat_converse').toggleClass('chat_converse2');
    });

    // The buttons that return the user to the main chat page
    //      Returns from the information page
    $('#help_chat').click(function(e) {
        enableChat();
        changeChatDisplay("basic_chat");
    });
    
    // Returns from the form feedback page
    $('#send_feedback_button').click(function(e) {
        enableChat();
        changeChatDisplay("basic_chat");
    });
    
    // Returns from the currently named example page
    $('#back_button').click(function(e) {
        enableChat();
        changeChatDisplay("basic_chat");
    });

    $(".message_form").on( "submit", function( event ) {
        event.preventDefault();

        var email = $(".message_form").find("#message_form_email").val();
        var subject = $(".message_form").find("#message_form_subject").val();
        var content = $(".message_form").find("#message_form_content").val();
        var data =  JSON.stringify({
            "username": username,
            "user_email": email,
            "subject": subject,
            "body": content
        });
        $.post({
            url: `${LLM_URL}/feedback`,
            type: "POST",
            data: data,
            headers: {
                "Authorization": `Bearer ${service_user}`
            },
            contentType: 'application/json',
            cache: false,
            processData: false,
            success: function(data){
                $("#chat_form").append(`
                <span class="chat_msg_item chat_msg_item_admin">
                    <div class="chat_avatar">
                        <img src="${chat_avatar_url}"/>
                    </div>
                    Thank you for taking the time to provide feedback!
                </span>
            `);
            },
            error: function(e) {
                $("#chat_form").append(`
                <span class="chat_msg_item chat_msg_item_admin">
                    <div class="chat_avatar">
                        <img src="${chat_avatar_url}"/>
                    </div>
                    Sorry, something went wrong. We'll review the logs and figure out what happened.
                </span>`
            )},
        }).done(function(data)
        {
        });
        $(".message_form").find("#message_form_email").val("");
        $(".message_form").find("#message_form_subject").val("");
        $(".message_form").find("#message_form_content").val(""); 
    });
});