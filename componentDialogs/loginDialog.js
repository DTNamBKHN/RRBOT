const { DialogSet, DialogTurnStatus, ComponentDialog, WaterfallDialog, ConfirmPrompt, TextPrompt, ActivityPrompt } = require('botbuilder-dialogs');

const { CardFactory, MessageFactory } = require('botbuilder');

const { ActivityTypes } = require('botbuilder');
// Load an adaptive card
const cardJson = require('../resources/adaptiveCards/loginCard.json');

const CONFIRM_PROMPT = 'CONFIRM_PROMPT';
const TEXT_PROMPT = 'TEXT_PROMPT';
const FORM_PROMPT = 'FORM_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';
class LoginDialog extends ComponentDialog {
    constructor(conservsationState, userState) {
        super('loginDialog');
        this.addDialog(new ActivityPrompt(FORM_PROMPT, async (prompt) => {
            // Only validate incoming messages
            const activity = prompt.recognized.value;
            console.log('activity');
            console.log(activity);
            if (activity.type === ActivityTypes.Message) {
                if (activity.value) {
                    // Return value from prompt
                    console.log('activity.value');
                    console.log(activity.value);
                    prompt.recognized.value = activity.value;
                    return true;
                } else {
                    // Reprompt user to fill in form
                    await prompt.context.sendActivity('Please fill in form and press "submit" button.');
                }
            }
            return false;
        }));
        this.addDialog(new ConfirmPrompt(CONFIRM_PROMPT));
        this.addDialog(new TextPrompt(TEXT_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.firstStep.bind(this),
            this.secondStep.bind(this),
            this.endStep.bind(this)
        ]));
        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(context, accessor) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);
        const dialogContext = await dialogSet.createContext(context);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id);
        }
    }

    async firstStep(stepContext) {
        // Call the prompt
        return await stepContext.prompt(CONFIRM_PROMPT, 'Would you like to log in?', ['yes', 'no']);
    }

    async secondStep(stepContext) {
        console.log('stepContext.result: ' + stepContext.result);
        if (stepContext.result === true) {
            const card = CardFactory.adaptiveCard(cardJson);
            const form = MessageFactory.attachment(card);
            return await stepContext.prompt(FORM_PROMPT, { prompt: form });
        }
        if (stepContext.result === false) {
            await stepContext.context.sendActivity('You chose not to go ahead with login.');
            endDialog = true;
            return await stepContext.endDialog();
        }
    }

    async endStep(stepContext) {
        // Use the result
        const result = stepContext.result;
        console.log('result');
        console.log(result);
        endDialog = true;
        return await stepContext.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }
}

module.exports.LoginDialog = LoginDialog;
