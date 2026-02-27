#!/usr/bin/env bun
import { Relay } from 'nostr-tools';
import {
	createAtobMachineDefinition,
	createContractEvent,
	createStateEvent,
	createTransitionEvent,
	updateStateEvent,
	loadMachineFromEvent,
	simulateTransition,
	PrivateKeySigner
} from '@atob/lib';
import { devRelay } from '../src/lib/services/relay-pool.js';

// Sample delivery data
const deliveryScenarios = [
	{
		id: 'demo-completed-001',
		title: 'Urgent Document Delivery',
		description: 'Important legal documents need to be delivered from downtown to the airport',
		state: 'completed',
		creatorKey: 'nsec1demokeycreator001',
		executorKey: 'nsec1demokeyexecutor001',
		receiverKey: 'nsec1demokeyreceiver001',
		amount: '5000',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5ruu'
	},
	{
		id: 'demo-in-transit-002',
		title: 'Package Delivery',
		description: 'Medium-sized package delivery across town',
		state: 'in_transit',
		creatorKey: 'nsec1demokeycreator002',
		executorKey: 'nsec1demokeyexecutor002',
		receiverKey: 'nsec1demokeyreceiver002',
		amount: '3000',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5rxy'
	},
	{
		id: 'demo-accepted-003',
		title: 'Food Delivery',
		description: 'Hot meal delivery from restaurant to customer',
		state: 'accepted',
		creatorKey: 'nsec1demokeycreator003',
		executorKey: 'nsec1demokeyexecutor003',
		receiverKey: 'nsec1demokeyreceiver003',
		amount: '1500',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5rxy'
	},
	{
		id: 'demo-created-004',
		title: 'Grocery Shopping',
		description: 'Weekly grocery delivery from supermarket to home',
		state: 'created',
		creatorKey: 'nsec1demokeycreator004',
		executorKey: null, // Not accepted yet
		receiverKey: 'nsec1demokeyreceiver004',
		amount: '2000',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5rxy'
	},
	{
		id: 'demo-delivered-005',
		title: 'Electronics Delivery',
		description: 'Fragile electronics delivery with special handling',
		state: 'delivered',
		creatorKey: 'nsec1demokeycreator005',
		executorKey: 'nsec1demokeyexecutor005',
		receiverKey: 'nsec1demokeyreceiver005',
		amount: '8000',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5ruu'
	},
	{
		id: 'demo-disputed-006',
		title: 'Furniture Delivery',
		description: 'Large furniture item delivery with assembly required',
		state: 'disputed',
		creatorKey: 'nsec1demokeycreator006',
		executorKey: 'nsec1demokeyexecutor006',
		receiverKey: 'nsec1demokeyreceiver006',
		amount: '10000',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5ruu'
	},
	{
		id: 'demo-canceled-007',
		title: 'Medicine Delivery',
		description: 'Prescription medicine delivery',
		state: 'canceled',
		creatorKey: 'nsec1demokeycreator007',
		executorKey: 'nsec1demokeyexecutor007',
		receiverKey: 'nsec1demokeyreceiver007',
		amount: '2500',
		pickup_geohash: 'dr5regy',
		dropoff_geohash: 'dr5rxy'
	}
];

// Create signers for demo purposes
const signers = new Map();

function getOrCreateSigner(keySeed: string): PrivateKeySigner {
	if (!signers.has(keySeed)) {
		// Create deterministic signers based on seed
		const signer = new PrivateKeySigner();
		signers.set(keySeed, signer);
	}
	return signers.get(keySeed);
}

async function createCompletedDelivery(scenario: any) {
	console.log(`Creating completed delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const executorSigner = getOrCreateSigner(scenario.executorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	let stateEvent = await createStateEvent(creatorSigner, scenario.id, contractEvent, currentState);

	const events = [contractEvent, stateEvent];

	// 5. Executor accepts the offer
	const acceptEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'ACCEPT');

	const { newSnapshot: acceptedSnapshot, persistedState: acceptedPersistedState } =
		simulateTransition(contractEvent, stateEvent, acceptEvent);

	events.push(acceptEvent);

	// 6. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		acceptedPersistedState
	);
	events.push(stateEvent);

	// 7. Executor starts transit
	const startTransitEvent = await createTransitionEvent(
		executorSigner,
		contractEvent.id,
		'START_TRANSIT'
	);

	const { newSnapshot: inTransitSnapshot, persistedState: inTransitPersistedState } =
		simulateTransition(contractEvent, stateEvent, startTransitEvent);

	events.push(startTransitEvent);

	// 8. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		inTransitPersistedState
	);
	events.push(stateEvent);

	// 9. Executor delivers the package
	const deliverEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'DELIVER');

	const { newSnapshot: deliveredSnapshot, persistedState: deliveredPersistedState } =
		simulateTransition(contractEvent, stateEvent, deliverEvent);

	events.push(deliverEvent);

	// 10. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		deliveredPersistedState
	);
	events.push(stateEvent);

	// 11. Receiver confirms delivery
	const confirmDeliveryEvent = await createTransitionEvent(
		receiverSigner,
		contractEvent.id,
		'CONFIRM_DELIVERY'
	);

	const { newSnapshot: completedSnapshot, persistedState: completedPersistedState } =
		simulateTransition(contractEvent, stateEvent, confirmDeliveryEvent);

	events.push(confirmDeliveryEvent);

	// 12. Update state event to final 'completed' state
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		completedPersistedState
	);
	events.push(stateEvent);

	return events;
}

async function createInTransitDelivery(scenario: any) {
	console.log(`Creating in-transit delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const executorSigner = getOrCreateSigner(scenario.executorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	let stateEvent = await createStateEvent(creatorSigner, scenario.id, contractEvent, currentState);

	const events = [contractEvent, stateEvent];

	// 5. Executor accepts the offer
	const acceptEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'ACCEPT');

	const { newSnapshot: acceptedSnapshot, persistedState: acceptedPersistedState } =
		simulateTransition(contractEvent, stateEvent, acceptEvent);

	events.push(acceptEvent);

	// 6. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		acceptedPersistedState
	);
	events.push(stateEvent);

	// 7. Executor starts transit
	const startTransitEvent = await createTransitionEvent(
		executorSigner,
		contractEvent.id,
		'START_TRANSIT'
	);

	const { newSnapshot: inTransitSnapshot, persistedState: inTransitPersistedState } =
		simulateTransition(contractEvent, stateEvent, startTransitEvent);

	events.push(startTransitEvent);

	// 8. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		inTransitPersistedState
	);
	events.push(stateEvent);

	return events;
}

async function createAcceptedDelivery(scenario: any) {
	console.log(`Creating accepted delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const executorSigner = getOrCreateSigner(scenario.executorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	let stateEvent = await createStateEvent(creatorSigner, scenario.id, contractEvent, currentState);

	const events = [contractEvent, stateEvent];

	// 5. Executor accepts the offer
	const acceptEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'ACCEPT');

	const { newSnapshot: acceptedSnapshot, persistedState: acceptedPersistedState } =
		simulateTransition(contractEvent, stateEvent, acceptEvent);

	events.push(acceptEvent);

	// 6. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		acceptedPersistedState
	);
	events.push(stateEvent);

	return events;
}

async function createCreatedDelivery(scenario: any) {
	console.log(`Creating created delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	const stateEvent = await createStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		currentState
	);

	return [contractEvent, stateEvent];
}

async function createDeliveredDelivery(scenario: any) {
	console.log(`Creating delivered delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const executorSigner = getOrCreateSigner(scenario.executorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	let stateEvent = await createStateEvent(creatorSigner, scenario.id, contractEvent, currentState);

	const events = [contractEvent, stateEvent];

	// 5. Executor accepts the offer
	const acceptEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'ACCEPT');

	const { newSnapshot: acceptedSnapshot, persistedState: acceptedPersistedState } =
		simulateTransition(contractEvent, stateEvent, acceptEvent);

	events.push(acceptEvent);

	// 6. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		acceptedPersistedState
	);
	events.push(stateEvent);

	// 7. Executor starts transit
	const startTransitEvent = await createTransitionEvent(
		executorSigner,
		contractEvent.id,
		'START_TRANSIT'
	);

	const { newSnapshot: inTransitSnapshot, persistedState: inTransitPersistedState } =
		simulateTransition(contractEvent, stateEvent, startTransitEvent);

	events.push(startTransitEvent);

	// 8. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		inTransitPersistedState
	);
	events.push(stateEvent);

	// 9. Executor delivers the package
	const deliverEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'DELIVER');

	const { newSnapshot: deliveredSnapshot, persistedState: deliveredPersistedState } =
		simulateTransition(contractEvent, stateEvent, deliverEvent);

	events.push(deliverEvent);

	// 10. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		deliveredPersistedState
	);
	events.push(stateEvent);

	return events;
}

async function createDisputedDelivery(scenario: any) {
	console.log(`Creating disputed delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const executorSigner = getOrCreateSigner(scenario.executorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	let stateEvent = await createStateEvent(creatorSigner, scenario.id, contractEvent, currentState);

	const events = [contractEvent, stateEvent];

	// 5. Executor accepts the offer
	const acceptEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'ACCEPT');

	const { newSnapshot: acceptedSnapshot, persistedState: acceptedPersistedState } =
		simulateTransition(contractEvent, stateEvent, acceptEvent);

	events.push(acceptEvent);

	// 6. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		acceptedPersistedState
	);
	events.push(stateEvent);

	// 7. Executor starts transit
	const startTransitEvent = await createTransitionEvent(
		executorSigner,
		contractEvent.id,
		'START_TRANSIT'
	);

	const { newSnapshot: inTransitSnapshot, persistedState: inTransitPersistedState } =
		simulateTransition(contractEvent, stateEvent, startTransitEvent);

	events.push(startTransitEvent);

	// 8. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		inTransitPersistedState
	);
	events.push(stateEvent);

	// 9. Creator disputes the delivery
	const disputeEvent = await createTransitionEvent(creatorSigner, contractEvent.id, 'DISPUTE');

	const { newSnapshot: disputedSnapshot, persistedState: disputedPersistedState } =
		simulateTransition(contractEvent, stateEvent, disputeEvent);

	events.push(disputeEvent);

	// 10. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		disputedPersistedState
	);
	events.push(stateEvent);

	return events;
}

async function createCanceledDelivery(scenario: any) {
	console.log(`Creating canceled delivery: ${scenario.title}`);

	const creatorSigner = getOrCreateSigner(scenario.creatorKey);
	const executorSigner = getOrCreateSigner(scenario.executorKey);
	const receiverSigner = getOrCreateSigner(scenario.receiverKey);

	// 1. Create state machine definition
	const atobMachineDefinition = createAtobMachineDefinition(
		await creatorSigner.getPublicKey(),
		await receiverSigner.getPublicKey()
	);

	// 2. Create contract event
	const contractEvent = await createContractEvent(
		creatorSigner,
		scenario.id,
		atobMachineDefinition,
		scenario.title,
		scenario.description,
		[
			['amount', scenario.amount],
			['pickup_geohash', scenario.pickup_geohash],
			['dropoff_geohash', scenario.dropoff_geohash]
		]
	);

	// 3. Create initial state
	const atobMachine = loadMachineFromEvent(contractEvent);
	const actor = createActor(atobMachine).start();
	const currentState = actor.getPersistedSnapshot();

	// 4. Create initial state event
	let stateEvent = await createStateEvent(creatorSigner, scenario.id, contractEvent, currentState);

	const events = [contractEvent, stateEvent];

	// 5. Executor accepts the offer
	const acceptEvent = await createTransitionEvent(executorSigner, contractEvent.id, 'ACCEPT');

	const { newSnapshot: acceptedSnapshot, persistedState: acceptedPersistedState } =
		simulateTransition(contractEvent, stateEvent, acceptEvent);

	events.push(acceptEvent);

	// 6. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		acceptedPersistedState
	);
	events.push(stateEvent);

	// 7. Creator cancels the delivery
	const cancelEvent = await createTransitionEvent(creatorSigner, contractEvent.id, 'CANCEL');

	const { newSnapshot: canceledSnapshot, persistedState: canceledPersistedState } =
		simulateTransition(contractEvent, stateEvent, cancelEvent);

	events.push(cancelEvent);

	// 8. Update state event
	stateEvent = await updateStateEvent(
		creatorSigner,
		scenario.id,
		contractEvent,
		canceledPersistedState
	);
	events.push(stateEvent);

	return events;
}

async function publishEvents(relay: Relay, events: any[]) {
	for (const event of events) {
		await relay.publish(event);
		console.log(`Published event: ${event.kind} - ${event.id}`);
	}
}

async function main() {
	console.log('Starting to populate dev relay with mock delivery data...');

	// Connect to the dev relay
	const relayUrl = devRelay[0];
	if (!relayUrl) {
		throw new Error('Dev relay URL is not defined');
	}
	const relay = await Relay.connect(relayUrl);
	console.log(`Connected to relay: ${relayUrl}`);

	try {
		// Create all delivery scenarios
		for (const scenario of deliveryScenarios) {
			let events: any[] = [];

			switch (scenario.state) {
				case 'completed':
					events = await createCompletedDelivery(scenario);
					break;
				case 'in_transit':
					events = await createInTransitDelivery(scenario);
					break;
				case 'accepted':
					events = await createAcceptedDelivery(scenario);
					break;
				case 'created':
					events = await createCreatedDelivery(scenario);
					break;
				case 'delivered':
					events = await createDeliveredDelivery(scenario);
					break;
				case 'disputed':
					events = await createDisputedDelivery(scenario);
					break;
				case 'canceled':
					events = await createCanceledDelivery(scenario);
					break;
			}

			// Publish all events for this scenario
			await publishEvents(relay, events);

			// Small delay between scenarios
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		console.log('Successfully populated dev relay with mock delivery data!');
		console.log(`Created ${deliveryScenarios.length} delivery scenarios with various states.`);
	} catch (error) {
		console.error('Error populating relay:', error);
	} finally {
		relay.close();
		console.log('Disconnected from relay');
	}
}

// Import createActor from xstate
import { createActor } from 'xstate';

// Run the script
main().catch(console.error);
