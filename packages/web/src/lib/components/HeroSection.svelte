<script lang="ts">
	import { onMount } from 'svelte';
	import { introState, introActions } from '$lib/stores/intro-state.svelte';

	let mounted = $state(false);
	let videoEnded = $state(false);
	let videoRef = $state<HTMLVideoElement | null>(null);
	let introPhase = $state(0); // 0: none, 1: "Move Packages", 2: "Build Reputation", 3: "Stack Sats", 4: done
	let currentImageIndex = $state(0);
	let hasSeenIntro = $state(false);
	let videoOpacity = $state(1);
	let showUI = $state(false);

	// Array of background images to rotate through
	const darkImages = ['/hero.jpeg', '/hero-3.jpeg', '/hero-4.jpeg', '/hero-5.jpeg'];
	const lightImages = [
		'/hero-light.jpg',
		'/hero-3-light.jpg',
		'/hero-4-light.jpg',
		'/hero-5-light.jpg'
	];

	onMount(() => {
		mounted = true;

		// Check if user has seen the intro before
		const seenIntro = localStorage.getItem('atob-intro-seen');
		if (seenIntro === 'true') {
			hasSeenIntro = true;
			videoEnded = true;
			showUI = true;
			introPhase = 4;
			introActions.skipIntro();
		} else {
			hasSeenIntro = false;
			showUI = false;
			introPhase = 0;
			introActions.startIntro();
		}

		return () => {
			// Cleanup
		};
	});

	// Handle intro phase transitions
	$effect(() => {
		if (introPhase === 0 || hasSeenIntro) return;

		let duration;
		if (introPhase === 1) {
			duration = 1000; // "Move Packages" lasts 1.0s
		} else if (introPhase === 2) {
			duration = 1000; // "Build Reputation" lasts 1.0s
		} else if (introPhase === 3) {
			duration = 1000; // "Stack Sats" lasts 1.0s
		}

		const timer = setTimeout(() => {
			if (introPhase < 4) {
				introPhase = introPhase + 1;
			} else {
				// Intro sequence complete, show main UI and mark as seen
				showUI = true;
				localStorage.setItem('atob-intro-seen', 'true');
				hasSeenIntro = true;
				introActions.completeIntro();
			}
		}, duration);

		return () => clearTimeout(timer);
	});

	// Handle background image rotation after video ends
	$effect(() => {
		if (!videoEnded) return;

		const interval = setInterval(() => {
			currentImageIndex = (currentImageIndex + 1) % darkImages.length;
		}, 4000); // Rotate every 4 seconds

		return () => clearInterval(interval);
	});

	// Handle video playback
	$effect(() => {
		if (videoRef && mounted && !hasSeenIntro) {
			// Force video to start from beginning and play
			videoRef.currentTime = 0;
			videoRef.style.opacity = '1';
			videoRef.style.display = 'block';
			videoEnded = false;
			showUI = false;

			// Force play the video
			const playPromise = videoRef.play();
			if (playPromise !== undefined) {
				playPromise
					.then(() => {
						// Start intro sequence after video starts playing
						setTimeout(() => {
							introPhase = 1;
						}, 500);
					})
					.catch((error) => {
						console.error('Video autoplay was prevented:', error);
						// If video fails to play, skip it and start the intro sequence
						videoEnded = true;
						introPhase = 1;
					});
			}
		}
	});

	function handleTimeUpdate(e: Event) {
		const video = e.target as HTMLVideoElement;
		const duration = video.duration;
		const currentTime = video.currentTime;

		// Start fading when video is 90% complete
		if (duration && currentTime >= duration * 0.9 && !videoEnded) {
			const fadeProgress = (currentTime - duration * 0.9) / (duration * 0.1);
			videoOpacity = 1 - fadeProgress;
		}
	}

	function handleVideoEnded() {
		videoEnded = true;
		videoOpacity = 0;
	}
</script>

<section class="relative flex min-h-[100dvh] items-center overflow-hidden pt-14 pb-8">
	<!-- Background Video with Image Transition -->
	<div class="absolute inset-0 z-0">
		<!-- Rotating Background Images - Dark Mode -->
		{#each darkImages as imageSrc, index}
			<img
				src={imageSrc}
				alt="Cyberpunk delivery scene"
				class="absolute inset-0 hidden h-full w-full object-cover object-center transition-opacity duration-1000 dark:block {videoEnded &&
				currentImageIndex === index
					? 'opacity-100'
					: 'opacity-0'}"
			/>
		{/each}
		<!-- Rotating Background Images - Light Mode -->
		{#each lightImages as imageSrc, index}
			<img
				src={imageSrc}
				alt="Cyberpunk delivery scene"
				class="absolute inset-0 block h-full w-full object-cover object-center transition-opacity duration-1000 dark:hidden {videoEnded &&
				currentImageIndex === index
					? 'opacity-100'
					: 'opacity-0'}"
			/>
		{/each}

		<!-- Video - plays once then fades out -->
		{#if mounted}
			<video
				bind:this={videoRef}
				muted
				playsinline
				class="h-full w-full object-cover object-center transition-opacity duration-1000"
				style="opacity: {videoEnded ? 0 : videoOpacity}"
				ontimeupdate={handleTimeUpdate}
				onended={handleVideoEnded}
			>
				<source src="/hero-alt.mp4" type="video/mp4" />
			</video>
		{/if}

		<!-- Overlay for readability - adjusts based on theme -->
		<div
			class="absolute inset-0 z-10 bg-gradient-to-r from-white/60 via-white/40 to-white/20 dark:from-black/80 dark:via-black/60 dark:to-black/40"
		></div>
		<!-- Cyberpunk color overlay -->
		<div
			class="absolute inset-0 z-10 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10"
		></div>
	</div>

	<!-- Neon glow effects -->
	<div
		class="animate-pulse-slow absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
	></div>
	<div
		class="animate-pulse-slow animation-delay-2000 absolute right-1/4 bottom-1/3 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl"
	></div>
	<div
		class="animate-pulse-slow absolute top-1/2 right-1/3 h-32 w-32 rounded-full bg-pink-500/20 blur-2xl"
	></div>

	<!-- Intro Text Overlay -->
	{#if !hasSeenIntro && introPhase > 0 && introPhase < 4}
		<div class="absolute inset-0 z-30">
			<div class="absolute top-1/2 left-1/2 w-full -translate-x-1/2 -translate-y-1/2 text-center">
				{#if introPhase === 1}
					<h1
						class="hero-text animate-center-fade text-4xl font-bold text-[#0A0A0A] uppercase md:text-6xl dark:text-[#C3C3C3]"
					>
						Move Packages
					</h1>
				{/if}
				{#if introPhase === 2}
					<h1
						class="hero-text animate-center-fade text-4xl font-bold text-[#0A0A0A] uppercase md:text-6xl dark:text-[#C3C3C3]"
					>
						Build Reputation
					</h1>
				{/if}
				{#if introPhase === 3}
					<h1
						class="hero-text animate-center-fade-glow text-4xl font-bold text-cyan-400 uppercase md:text-6xl"
					>
						Stack Sats
					</h1>
				{/if}
			</div>
		</div>
	{/if}

	<div class="relative z-20 container mx-auto px-4">
		<div
			class="grid grid-cols-1 gap-6 transition-all duration-1000 lg:grid-cols-12 lg:items-center lg:gap-8 {showUI
				? 'animate-slide-up-fade opacity-100'
				: 'opacity-0'}"
		>
			<!-- Left Content -->
			<div
				class="flex flex-col items-start justify-center py-8 text-left lg:col-span-7 lg:min-h-0 lg:justify-start"
			>
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 backdrop-blur-sm"
				>
					<span class="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400"></span>
					<span
						class="text-xs font-medium text-cyan-300 text-cyan-600 sm:text-sm dark:text-cyan-300"
					>
						Decentralized Delivery Platform
					</span>
				</div>

				<h1
					class="hero-text mb-4 text-3xl leading-tight font-bold uppercase sm:text-5xl md:text-6xl lg:text-5xl"
				>
					<span
						class="block text-[#0A0A0A] drop-shadow-lg transition-all duration-1500 dark:text-[#C3C3C3] {showUI
							? 'animate-slide-in-right animation-delay-300 opacity-100'
							: 'opacity-0'}"
					>
						Move Packages,
					</span>
					<span
						class="block text-[#0A0A0A] drop-shadow-lg transition-all duration-1500 dark:text-[#C3C3C3] {showUI
							? 'animate-slide-in-right animation-delay-600 opacity-100'
							: 'opacity-0'}"
					>
						Build Reputation,
					</span>
					<span
						class="block font-extrabold text-cyan-400 transition-all duration-1500 {showUI
							? 'animate-glow-after-slide animation-delay-900 opacity-100'
							: 'opacity-0'}"
					>
						Stack Sats.
					</span>
				</h1>
			</div>

			<!-- Right Content - Desktop and Mobile -->
			<div class="flex flex-col lg:col-span-5">
				<div
					class="rounded-2xl border border-cyan-500/20 bg-black/30 bg-white/30 p-4 backdrop-blur-sm sm:p-6 dark:bg-black/30"
				>
					<p
						class="text-sm leading-relaxed text-gray-300 text-gray-800 drop-shadow-md sm:text-base lg:text-lg dark:text-gray-300"
					>
						<span class="font-bold">A TO ₿</span> connects people who need packages delivered with
						those who can deliver them, all powered by
						<span class="font-semibold text-cyan-400 text-cyan-600 dark:text-cyan-400"
							>Nostr technology</span
						>.
					</p>

					<div class="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
						<div class="flex items-center gap-3">
							<div class="h-2 w-2 rounded-full bg-cyan-400"></div>
							<span
								class="lg:text-md text-xs text-gray-400 text-gray-700 sm:text-sm dark:text-gray-400"
								>Decentralized & Trustless</span
							>
						</div>
						<div class="flex items-center gap-3">
							<div class="h-2 w-2 rounded-full bg-purple-400"></div>
							<span
								class="lg:text-md text-xs text-gray-400 text-gray-700 sm:text-sm dark:text-gray-400"
								>Bitcoin Payments <span class="text-xs opacity-70">(coming soon)</span></span
							>
						</div>
						<div class="flex items-center gap-3">
							<div class="h-2 w-2 rounded-full bg-pink-400"></div>
							<span
								class="lg:text-md text-xs text-gray-400 text-gray-700 sm:text-sm dark:text-gray-400"
								>Reputation System <span class="text-xs opacity-70">(coming soon)</span></span
							>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
