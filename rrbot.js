// Database connection.
import { initializeApp } from 'firebase/app';
const firebaseConfig = {
    apiKey: 'AIzaSyCMDMCYT0Jue6E7J1-90C4llg3Va8etOCU',
    authDomain: 'restaurant-reservation-bot.firebaseapp.com',
    projectId: 'restaurant-reservation-bot',
    storageBucket: 'restaurant-reservation-bot.appspot.com',
    messagingSenderId: '338221774559',
    appId: '1:338221774559:web:d9d848b552151423781b6a'
};

// init firebase app
initializeApp(firebaseConfig);
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory } = require('botbuilder');

const { ReadMenuDialog } = require('./componentDialogs/readMenuDialog');
const { MakeReservationDialog } = require('./componentDialogs/makeReservationDialog');
const { CancelReservationDialog } = require('./componentDialogs/cancelReservationDialog');
const { LoginDialog } = require('./componentDialogs/loginDialog');
const { LuisRecognizer, QnAMaker } = require('botbuilder-ai');
class RRBOT extends ActivityHandler {
    constructor(conversationState, userState) {
        super();

        this.conversationState = conversationState;
        this.userState = userState;
        this.dialogState = conversationState.createProperty('dialogState');
        this.readMenuDialog = new ReadMenuDialog(this.conversationState, this.userState);
        this.makeReservationDialog = new MakeReservationDialog(this.conversationState, this.userState);
        this.cancelReservationDialog = new CancelReservationDialog(this.conversationState, this.userState);
        this.loginDialog = new LoginDialog(this.conversationState, this.userState);
        this.previousIntent = this.conversationState.createProperty('previousIntent');
        this.conversationData = this.conversationState.createProperty('conservationData');

        const dispatchRecognizer = new LuisRecognizer({
            applicationId: process.env.LuisAppId,
            endpointKey: process.env.LuisAPIKey,
            endpoint: `https://${ process.env.LuisAPIHostName }.cognitiveservices.azure.com`
        }, {
            includeAllIntents: true
        }, true);

        const qnaMaker = new QnAMaker({
            knowledgeBaseId: process.env.QnAKnowledgebaseId,
            endpointKey: process.env.QnAEndpointKey,
            host: process.env.QnAEndpointHostName
        });

        this.qnaMaker = qnaMaker;

        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const luisResult = await dispatchRecognizer.recognize(context);
            const intent = LuisRecognizer.topIntent(luisResult);
            const entities = luisResult.entities;
            console.log('entities');
            console.log(entities);
            await this.dispatchToIntentAsync(context, intent, entities);
            await next();
        });

        this.onDialog(async (context, next) => {
            // Save any state changes. The load happened during the execution of the Dialog.
            await this.conversationState.saveChanges(context, false);
            await this.userState.saveChanges(context, false);
            await next();
        });

        this.onMembersAdded(async (context, next) => {
            await this.sendWelcomeMessage(context);
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }

    async sendWelcomeMessage(turnContext) {
        const { activity } = turnContext;

        // Iterate over all new members added to the conversation.
        for (const idx in activity.membersAdded) {
            if (activity.membersAdded[idx].id !== activity.recipient.id) {
                const welcomeMessage = 'Welcome to Restaurant Reservation Bot. How can I help you today?';
                await turnContext.sendActivity(welcomeMessage);
                await this.sendSuggestedActions(turnContext);
            }
        }
    }

    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(['Make Reservation', 'Cancel Reservation', 'Read the Menu'], 'What would you like to do today ?');
        await turnContext.sendActivity(reply);
    }

    async dispatchToIntentAsync(context, intent, entities) {
        var currentIntent = '';
        const previousIntent = await this.previousIntent.get(context, {});
        const conversationData = await this.conversationData.get(context, {});

        if (previousIntent.intentName && conversationData.endDialog === false) {
            currentIntent = previousIntent.intentName;
            console.log('1-' + currentIntent);
        } else if (previousIntent.intentName && conversationData.endDialog === true) {
            currentIntent = intent;
            console.log('2-' + currentIntent);
        } else if (intent === 'None' && !previousIntent.intentName) {
            var result = await this.qnaMaker.getAnswers(context);
            await context.sendActivity(`${ result[0].answer }`);
            await this.sendSuggestedActions(context);
        } else {
            currentIntent = intent;
            console.log('3-' + currentIntent);
            await this.previousIntent.set(context, { intentName: intent });
            // await this.conversationData.set(context, { entity: entities });
        }

        switch (currentIntent) {
        // case 'Login':
        //     console.log('Inside Login Dialog');
        //     await this.conversationData.set(context, { endDialog: false });
        //     await this.loginDialog.run(context, this.dialogState);
        //     conversationData.endDialog = await this.loginDialog.isDialogComplete();
        //     if (conversationData.endDialog) {
        //         await this.previousIntent.set(context, { intentName: null });
        //         await this.sendSuggestedActions(context);
        //         count++;
        //     }
        //     break;
        case 'RestaurantReservation_ReadMenu':
            console.log('Inside RestaurantReservation_ReadMenu Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.readMenuDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.readMenuDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.conversationData.set(context, { entity: null });
                await this.sendSuggestedActions(context);
            }
            break;
        case 'RestaurantReservation_Reserve':
            console.log('Inside RestaurantReservation_Reserve Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.makeReservationDialog.run(context, this.dialogState, entities);
            conversationData.endDialog = await this.makeReservationDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.sendSuggestedActions(context);
            }
            break;

        case 'RestaurantReservation_DeleteReservation':
            console.log('Inside Cancel Reservation Case');
            await this.conversationData.set(context, { endDialog: false });
            await this.cancelReservationDialog.run(context, this.dialogState);
            conversationData.endDialog = await this.cancelReservationDialog.isDialogComplete();
            if (conversationData.endDialog) {
                await this.previousIntent.set(context, { intentName: null });
                await this.sendSuggestedActions(context);
            }
            break;

        default:
            console.log('Did not match any case');
            break;
        }
    }
}

module.exports.RRBOT = RRBOT;
