// Store to track intro animation state
export const introState = $state({
	isPlaying: false,
	hasCompleted: false
});

export const introActions = {
	startIntro: () => {
		introState.isPlaying = true;
		introState.hasCompleted = false;
	},

	completeIntro: () => {
		introState.isPlaying = false;
		introState.hasCompleted = true;
	},

	skipIntro: () => {
		introState.isPlaying = false;
		introState.hasCompleted = true;
	}
};
