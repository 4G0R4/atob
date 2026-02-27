<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import ThemeToggle from './ThemeToggle.svelte';
	import AccountLoginDialog from './AccountLoginDialog.svelte';
	import ProfileCard from './ProfileCard.svelte';
	import { activeAccount, logout } from '$lib/services/accountManager.svelte';
	import { buttonVariants } from './ui/button/index.js';
	import * as Sheet from './ui/sheet/index.js';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Button from './ui/button/button.svelte';
	import { page } from '$app/state';
	import { introState } from '$lib/stores/intro-state.svelte';
	import { goto } from '$app/navigation';

	const isHomepage = $derived(page.url.pathname === '/');
	const shouldHideHeader = $derived(isHomepage && introState.isPlaying);

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Optimized mobile navigation function
	function handleMobileNav(href: string) {
		mobileMenuOpen = false; // Close menu immediately
		goto(href); // Use SvelteKit's optimized navigation
	}
</script>

<header
	class="fixed top-0 right-0 left-0 z-50 transition-opacity duration-500 {shouldHideHeader
		? 'pointer-events-none opacity-0'
		: 'opacity-100'} {isHomepage ? '' : 'bg-black/20 backdrop-blur-lg'}"
>
	<div class="flex h-14 items-center justify-between px-4 py-4 sm:px-6">
		<!-- Logo -->
		<a
			href="/"
			class="hero-text flex items-center space-x-2 text-lg font-semibold text-[#0A0A0A] transition-transform duration-200 hover:scale-105 hover:text-cyan-400 dark:text-[#C3C3C3]"
		>
			Ato₿
		</a>

		<!-- Desktop Navigation -->
		<div class="hidden items-center space-x-4 lg:flex lg:space-x-6">
			<!-- Navigation Links -->
			<nav class="flex items-center space-x-4 text-base font-normal lg:space-x-6">
				<a
					href="/deliveries/create"
					class="{page.url.pathname === '/deliveries/create'
						? 'text-purple-400'
						: 'text-[#0A0A0A] hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
				>
					Create Delivery
				</a>
				<a
					href="/deliveries/public"
					class="{page.url.pathname === '/deliveries/public'
						? 'text-purple-400'
						: 'text-[#0A0A0A] hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
				>
					Public Deliveries
				</a>
				<a
					href="/deliveries"
					class="{page.url.pathname === '/deliveries'
						? 'text-purple-400'
						: 'text-[#0A0A0A] hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
				>
					My Deliveries
				</a>
				<a
					href="/deliveries/my-packages"
					class="{page.url.pathname === '/deliveries/my-packages'
						? 'text-purple-400'
						: 'text-[#0A0A0A] hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
				>
					My Packages
				</a>
				<a
					href="/about"
					class="{page.url.pathname === '/about'
						? 'text-purple-400'
						: 'text-[#0A0A0A] hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
				>
					About
				</a>
			</nav>
			<div class="flex items-center gap-2 lg:gap-4">
				{#if $activeAccount}
					<div class="hidden items-center gap-2 lg:flex lg:gap-3">
						<ProfileCard pubkey={$activeAccount.pubkey} />
					</div>
					<Button variant="ghost" size="icon" onclick={logout} aria-label="Logout">
						<LogOut class="h-4 w-4" />
					</Button>
				{:else}
					<div class="hidden lg:block">
						<AccountLoginDialog />
					</div>
				{/if}
			</div>
			<!-- Theme Toggle -->
			<div class="flex items-center space-x-2">
				<ThemeToggle />
			</div>
		</div>

		<!-- Mobile Menu Button -->
		<div class="flex items-center space-x-2 lg:hidden">
			<ThemeToggle />
			<Sheet.Root bind:open={mobileMenuOpen}>
				<Sheet.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' })} aria-label="Menu">
					<Menu class="h-5 w-5" />
				</Sheet.Trigger>
				<Sheet.Content side="right" class="w-[300px] p-6 sm:w-[400px]">
					<div class="py-4">
						<nav class="flex flex-col space-y-1">
							<Button
								onclick={() => handleMobileNav('/deliveries/create')}
								class="rounded-md px-4 py-3 text-left text-base font-normal {page.url.pathname ===
								'/deliveries/create'
									? 'bg-purple-500/10 text-purple-400'
									: 'text-[#0A0A0A] hover:bg-purple-500/10 hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
							>
								Create Delivery
							</Button>
							<Button
								onclick={() => handleMobileNav('/deliveries/public')}
								class="rounded-md px-4 py-3 text-left text-base font-normal {page.url.pathname ===
								'/deliveries/public'
									? 'bg-purple-500/10 text-purple-400'
									: 'text-[#0A0A0A] hover:bg-purple-500/10 hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
							>
								Public Deliveries
							</Button>
							<Button
								onclick={() => handleMobileNav('/deliveries')}
								class="rounded-md px-4 py-3 text-left text-base font-normal {page.url.pathname ===
								'/deliveries'
									? 'bg-purple-500/10 text-purple-400'
									: 'text-[#0A0A0A] hover:bg-purple-500/10 hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
							>
								My Deliveries
							</Button>
							<Button
								onclick={() => handleMobileNav('/deliveries/my-packages')}
								class="rounded-md px-4 py-3 text-left text-base font-normal {page.url.pathname ===
								'/deliveries/my-packages'
									? 'bg-purple-500/10 text-purple-400'
									: 'text-[#0A0A0A] hover:bg-purple-500/10 hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
							>
								My Packages
							</Button>
							<Button
								onclick={() => handleMobileNav('/about')}
								class="rounded-md px-4 py-3 text-left text-base font-normal {page.url.pathname ===
								'/about'
									? 'bg-purple-500/10 text-purple-400'
									: 'text-[#0A0A0A] hover:bg-purple-500/10 hover:text-purple-400 dark:text-[#C3C3C3]'} transition-colors"
							>
								About
							</Button>
						</nav>
						<div class="mt-8 border-t pt-6">
							{#if $activeAccount}
								<div class="flex flex-col gap-4 px-2">
									<ProfileCard pubkey={$activeAccount.pubkey} />
									<Button
										variant="outline"
										onclick={() => {
											logout();
											mobileMenuOpen = false;
										}}
										class="w-full border-purple-400/20 bg-black/20 text-purple-300 hover:border-purple-400/30 hover:bg-purple-400/10"
									>
										<LogOut class="mr-2 h-4 w-4" />
										Sign Out
									</Button>
								</div>
							{:else}
								<div class="px-2">
									<AccountLoginDialog />
								</div>
							{/if}
						</div>
					</div>
				</Sheet.Content>
			</Sheet.Root>
		</div>
	</div>
</header>
