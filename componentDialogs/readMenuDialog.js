import { getFirestore, collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';

// init services
const db = getFirestore();

// menu ref
const menusRef = collection(db, 'Menus');

const getMenu = async (mealType) => {
    const q = query(menusRef, where('MealType', '==', mealType));
    const snapshot = await getDocs(q);
    const menus = [];
    snapshot.docs.forEach(doc => {
        menus.push({ ...doc.data(), id: doc.id });
    });
    return menus;
};

const { ComponentDialog, ChoicePrompt, WaterfallDialog, ChoiceFactory } = require('botbuilder-dialogs');

const { DialogSet, DialogTurnStatus } = require('botbuilder-dialogs');

const { CardFactory, AttachmentLayoutTypes } = require('botbuilder');

const CHOICE_PROMPT = 'CHOICE_PROMPT';
const WATERFALL_DIALOG = 'WATERFALL_DIALOG';
var endDialog = '';

class ReadMenuDialog extends ComponentDialog {
    constructor(conservsationState, userState) {
        super('readMenuDialog');
        this.addDialog(new ChoicePrompt(CHOICE_PROMPT));
        this.addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
            this.getMealType.bind(this),
            this.endStep.bind(this)
        ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    async run(turnContext, accessor, entities) {
        const dialogSet = new DialogSet(accessor);
        dialogSet.add(this);

        const dialogContext = await dialogSet.createContext(turnContext);
        const results = await dialogContext.continueDialog();
        if (results.status === DialogTurnStatus.empty) {
            await dialogContext.beginDialog(this.id, entities);
        }
    }

    async getMealType(step) {
        endDialog = false;
        if (step._info.options.RestaurantReservation_MealType) {
            step.values.mealType = step._info.options.RestaurantReservation_MealType;
            return await step.continueDialog();
        }
        // Running a prompt here means the next WaterfallStep will be run when the users response is received.
        return await step.prompt(CHOICE_PROMPT, {
            prompt: 'Which menu would you like to see?',
            choices: ChoiceFactory.toChoices(['Appetizer', 'Main', 'Dessert', 'Drink'])
        });
    }

    async endStep(step) {
        if (!step.values.mealType) {
            step.values.mealType = step.result;
            const mealType = step.values.mealType.value;
            console.log('mealType1');
            console.log(mealType);
            const menus = await getMenu(mealType.toLowerCase());
            const menuCardList = [];
            menus.forEach(menu => {
                menuCardList.push(this.createHeroCard(menu.Title, menu.MealName, menu.Summary, menu.ImageURL));
            });
            endDialog = true;
            // console.log('menuCardList');
            // console.log(menuCardList);
            await step.context.sendActivity({
                attachments: menuCardList,
                attachmentLayout: AttachmentLayoutTypes.Carousel
            });
            return await step.endDialog();
        }
        const mealType = step.values.mealType[0];
        console.log(step.values.mealType);
        console.log('mealType2');
        console.log(mealType);
        const menus = await getMenu(mealType[0].toLowerCase());
        const menuCardList = [];
        menus.forEach(menu => {
            menuCardList.push(this.createHeroCard(menu.Title, menu.MealName, menu.Summary, menu.ImageURL));
        });
        endDialog = true;
        // console.log('menuCardList');
        // console.log(menuCardList);
        await step.context.sendActivity({
            attachments: menuCardList,
            attachmentLayout: AttachmentLayoutTypes.Carousel
        });
        return await step.endDialog();
    }

    async isDialogComplete() {
        return endDialog;
    }

    // Hanlde interruption
    async onContinueDialog(innerDc) {
        const result = await this.interrupt(innerDc);
        if (result) {
            return result;
        }
        return await super.onContinueDialog(innerDc);
    }

    async interrupt(innerDc) {
        if (innerDc.context.activity.text) {
            const text = innerDc.context.activity.text.toLowerCase();

            switch (text) {
            case 'help':
            case '?': {
                const helpMessageText = 'Show help here';
                await innerDc.context.sendActivity(helpMessageText);
                return { status: DialogTurnStatus.waiting };
            }
            case 'cancel':
            case 'quit': {
                const cancelMessageText = 'Cancelling...';
                await innerDc.context.sendActivity(cancelMessageText);
                endDialog = true;
                return await innerDc.cancelAllDialogs();
            }
            }
        }
    }

    createHeroCard(title, subtitle, text, image) {
        return CardFactory.heroCard(
            title,
            CardFactory.images([image]),
            CardFactory.actions([
                {
                    type: 'openUrl',
                    title: 'See image',
                    value: image
                }
            ])
        );
    }
}

module.exports.ReadMenuDialog = ReadMenuDialog;
