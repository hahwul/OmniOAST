<template>
    <div class="h-full w-full flex gap-4">
        <!-- Guide Section -->
        <Card class="w-full h-full overflow-auto shadow-md">
            <template #title>
                <div class="flex items-center gap-2">
                    <i class="pi pi-book text-primary"></i>
                    <h2 class="text-2xl font-bold text-primary">
                        OmniOAST Guide
                    </h2>
                </div>
            </template>
            <template #content>
                <div class="space-y-8">
                    <!-- Managing Providers Section -->
                    <div
                        class="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 shadow-sm"
                    >
                        <div class="flex items-center mb-3 text-primary">
                            <i class="pi pi-server mr-2 text-xl"></i>
                            <h3 class="text-xl font-semibold">
                                1. Managing Providers
                            </h3>
                        </div>
                        <p class="mb-3 text-surface-600 dark:text-surface-200">
                            Navigate to the
                            <Badge
                                value="Provider"
                                severity="info"
                                class="ml-1 mr-1"
                            />
                            tab to create and manage OAST providers:
                        </p>
                        <div class="mb-4 pl-4 border-l-4 border-primary-200">
                            <p class="font-medium mb-2">
                                Create a new provider by entering:
                            </p>
                            <ul class="list-none space-y-2">
                                <li class="flex items-start">
                                    <i
                                        class="pi pi-tag mr-2 mt-1 text-primary-500"
                                    ></i>
                                    <div>
                                        <span class="font-semibold">Name:</span>
                                        A unique identifier for your provider
                                    </div>
                                </li>
                                <li class="flex items-start">
                                    <i
                                        class="pi pi-list mr-2 mt-1 text-primary-500"
                                    ></i>
                                    <div>
                                        <span class="font-semibold">Type:</span>
                                        Select the provider type (Interactsh,
                                        BOAST, etc.)
                                    </div>
                                </li>
                                <li class="flex items-start">
                                    <i
                                        class="pi pi-link mr-2 mt-1 text-primary-500"
                                    ></i>
                                    <div>
                                        <span class="font-semibold">URL:</span>
                                        The provider's URL endpoint
                                    </div>
                                </li>
                                <li class="flex items-start">
                                    <i
                                        class="pi pi-key mr-2 mt-1 text-primary-500"
                                    ></i>
                                    <div>
                                        <span class="font-semibold"
                                            >Token:</span
                                        >
                                        Authentication token (if required)
                                    </div>
                                </li>
                            </ul>
                        </div>
                        <Divider align="left">
                            <span class="p-tag">Quick Setup</span>
                        </Divider>
                        <p class="mb-2 text-surface-600 dark:text-surface-200">
                            For convenience, you can quickly add pre-configured
                            public providers:
                        </p>
                        <div class="flex gap-2">
                            <Button
                                icon="fa fa-bolt"
                                label="Quick Add"
                                severity="info"
                                outlined
                                class="p-button-sm"
                                disabled
                            />
                        </div>
                    </div>

                    <!-- Working with Payloads Section -->
                    <div
                        class="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 shadow-sm"
                    >
                        <div class="flex items-center mb-3 text-primary">
                            <i class="pi pi-code mr-2 text-xl"></i>
                            <h3 class="text-xl font-semibold">
                                2. Working with Payloads and Interactions
                            </h3>
                        </div>
                        <p class="mb-3 text-surface-600 dark:text-surface-200">
                            In the
                            <Badge
                                value="OAST"
                                severity="info"
                                class="ml-1 mr-1"
                            />
                            tab, you can:
                        </p>
                        <Panel
                            header="Generate Payloads"
                            toggleable
                            collapsed
                            class="mb-3"
                        >
                            <div class="p-2">
                                Select a provider from the dropdown to create
                                custom OAST payloads for your security testing.
                            </div>
                        </Panel>
                        <Panel
                            header="Monitor Interactions"
                            toggleable
                            collapsed
                        >
                            <div class="space-y-2 p-2">
                                <p>
                                    View all interactions received from your
                                    OAST providers with these features:
                                </p>
                                <ul class="list-none pl-2">
                                    <li class="flex items-center py-1">
                                        <i
                                            class="pi pi-search mr-2 text-primary-500"
                                        ></i>
                                        <span
                                            >Search for specific
                                            interactions</span
                                        >
                                    </li>
                                    <li class="flex items-center py-1">
                                        <i
                                            class="pi pi-filter mr-2 text-primary-500"
                                        ></i>
                                        <span
                                            >Filter interactions by
                                            provider</span
                                        >
                                    </li>
                                    <li class="flex items-center py-1">
                                        <i
                                            class="pi pi-info-circle mr-2 text-primary-500"
                                        ></i>
                                        <span
                                            >Track detailed information for each
                                            interaction</span
                                        >
                                    </li>
                                </ul>
                            </div>
                        </Panel>
                    </div>

                    <!-- Configuration Section -->
                    <div
                        class="bg-surface-50 dark:bg-surface-900 rounded-lg p-4 shadow-sm"
                    >
                        <div class="flex items-center mb-3 text-primary">
                            <i class="pi pi-cog mr-2 text-xl"></i>
                            <h3 class="text-xl font-semibold">
                                3. Configuration Settings
                            </h3>
                        </div>
                        <p class="mb-3 text-surface-600 dark:text-surface-200">
                            Access the
                            <Badge
                                value="Settings"
                                severity="info"
                                class="ml-1 mr-1"
                            />
                            tab to customize:
                        </p>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div
                                class="bg-surface-0 dark:bg-surface-800 p-3 rounded shadow-sm border border-surface-200 dark:border-surface-600"
                            >
                                <div class="flex items-center mb-2">
                                    <i
                                        class="pi pi-clock mr-2 text-primary-500"
                                    ></i>
                                    <h4 class="font-semibold">
                                        Polling Interval
                                    </h4>
                                </div>
                                <p
                                    class="text-sm text-surface-600 dark:text-surface-300"
                                >
                                    Adjust how frequently OmniOAST checks for
                                    new interactions
                                </p>
                            </div>
                            <div
                                class="bg-surface-0 dark:bg-surface-800 p-3 rounded shadow-sm border border-surface-200 dark:border-surface-600"
                            >
                                <div class="flex items-center mb-2">
                                    <i
                                        class="pi pi-pencil mr-2 text-primary-500"
                                    ></i>
                                    <h4 class="font-semibold">
                                        Payload Prefix
                                    </h4>
                                </div>
                                <p
                                    class="text-sm text-surface-600 dark:text-surface-300"
                                >
                                    Configure custom prefixes for your generated
                                    payloads
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </Card>

        <!-- About Section -->
        <Card class="w-full h-full overflow-auto shadow-md">
            <template #header>
                <img
                    class="w-full rounded-t"
                    src="https://github.com/hahwul/OmniOAST/blob/main/images/omnioast-banner.jpg?raw=true"
                    alt="OmniOAST"
                />
            </template>
            <template #title>
                <div class="flex items-center gap-2">
                    <i class="pi pi-info-circle text-primary"></i>
                    <h2 class="text-2xl font-bold text-primary">
                        About OmniOAST
                    </h2>
                </div>
            </template>
            <template #content>
                <div class="space-y-6">
                    <div
                        class="bg-surface-50 dark:bg-surface-900 rounded-lg p-4"
                    >
                        <p class="leading-relaxed">
                            OmniOAST is the all-in-one Caido plugin for managing
                            all your OAST providers and Interactions. It's
                            designed to streamline workflows for security
                            professionals by efficiently handling multiple OAST
                            (Out-of-Band Application Security Testing)
                            providers.
                        </p>
                    </div>

                    <div>
                        <h3
                            class="text-xl font-semibold mb-3 flex items-center"
                        >
                            Creator
                        </h3>
                        <div class="flex items-center gap-3 mb-4">
                            <div>
                                <div class="text-primary-500 text-lg font-bold">
                                    @hahwul
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3
                            class="text-xl font-semibold mb-3 flex items-center"
                        >
                            Main Contributors
                        </h3>
                        <div class="flex items-center gap-3 mb-4">
                            <div>
                                <div class="text-primary-500 text-lg font-bold">
                                    @GangGreenTemperTatum
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </Card>
    </div>
</template>

<script setup lang="ts">
// Import PrimeVue components
import Card from "primevue/card";
import Button from "primevue/button";
import Panel from "primevue/panel";
import Badge from "primevue/badge";
import Divider from "primevue/divider";
</script>
