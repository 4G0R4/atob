<script lang="ts">
	import { Lock, LockOpen } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';

	let { isEncrypted = false, hasAccess = true } = $props();
</script>

{#if isEncrypted}
	<Badge variant={hasAccess ? 'default' : 'secondary'} class="flex items-center gap-1">
		{#if hasAccess}
			<Lock class="h-3 w-3" />
			<span>Encrypted</span>
		{:else}
			<LockOpen class="h-3 w-3" />
			<span>No Access</span>
		{/if}
	</Badge>
{/if}
