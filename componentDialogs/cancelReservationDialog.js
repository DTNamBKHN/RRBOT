const { WaterfallDialog, ComponentDialog } = require('botbuilder-dialogs');

const { ConfirmPrompt, ChoicePrompt, DateTimePrompt, NumberPrompt, TextPrompt } = require('botbuilder-dialogs');

const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const { CardFactory } = require('botbuilder');

const RestaurantCard = require('../resources/adaptiveCards/Restaurantcard.json');

const CARDS = [

    RestaurantCard
];

const { MessageFactory } = require('botbuilder');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const NUMBER_PROMPT = 'NUMBER_PROMPT';
const DATETIME_PROMPT = 'DATETIME_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class CancelReservationDialog extends ComponentDialog {
    constructor(conservsationState, userState) {
        super('cancelReservationDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new NumberPrompt(NUMBER_PROMPT));
        this.addDialog(new DateTimePrompt(DATETIME_PROMPT));

        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this), // Ask confirmation if user wants to make reservation?
            this.confirmStep.bind(this), // Show summary of values entered by user and ask confirmation to make reservation
            this.summaryStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(step) {
        endDialog = false;
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        CARDS[0].body[0].text = 'Card Title';
        CARDS[0].body[1].columns[0].items[0].url = 'https://firebasestorage.googleapis.com/v0/b/restaurant-reservation-bot.appspot.com/o/Broken%20Rice%20(C%C6%A1m%20t%E1%BA%A5m).jpg?alt=media&token=0f16e62c-b04c-429a-bcb4-485feb69b604';
        CARDS[0].body[1].columns[1].items[0].text = 'Thanh Nam';
        CARDS[0].body[2].text = 'Hahahaha';
        CARDS[0].actions[0].url = 'https://www.google.com/';

        // await step.context.sendActivity({
        //     text: 'Enter reservation details for cancellation:',
        //     attachments: [CardFactory.bind(CARDS[0])]
        // });
        const card = CardFactory.adaptiveCard(CARDS[0]);
        const msg = MessageFactory.text('Enter reservation details for cancellation:');
        msg.attachments = [card];
        await step.context.sendActivity(msg);

        return await step.prompt(TEXT_PROMPT, '');
    }

    async confirmStep(step) {
        step.values.reservationNo = step.result;
        var msg = ` You have entered following values: \n Reservation Number: ${ step.values.reservationNo }`;

        await step.context.sendActivity(msg);

        return await step.prompt(CONFIRM_PROMPT, 'Are you sure that all values are correct and you want to CANCEL the reservation?', ['yes', 'no']);
    }

    async summaryStep(step) {
        if (step.result === true) {
            // Business
            await step.context.sendActivity('Reservation successfully cancelled. Your reservation id is : 12345678');
            endDialog = true;
            return await step.endDialog();
        }
        if (step.result === false) {
            await step.context.sendActivity('You chose not to go ahead with reservation.');
            endDialog = true;
            return await step.endDialog();
        }
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.CancelReservationDialog = CancelReservationDialog;
