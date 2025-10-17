<template>
    <section class="bg-white p-4 h-full rounded-lg flex flex-col space-y-4">
        <div class="flex justify-between items-center">
            <div class="flex gap-2">
                <button class="px-4 py-2 text-white bg-blue-600 rounded-md text-sm">All</button>
                <button class="px-4 py-2 rounded-md hover:text-gray-900 hover:bg-gray-100 text-sm">Beverages</button>
            </div>
            <div class="flex items-center gap-3">
                <input type="text" placeholder="Search Product (title or barcode)"
                    class="w-100 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
        </div>
        <div class="grid grid-cols-4 gap-4 flex-1">
            <div class="col-span-3 bg-red-300">
                <div class="grid grid-cols-3 p-4 gap-4">
                    <div class="bg-green-200 h-10">

                    </div>
                    <div class="bg-green-200 h-10">

                    </div>
                    <div class="bg-green-200 h-10">

                    </div>
                    <div class="bg-green-200 h-10">

                    </div>
                    <div class="bg-green-200 h-10">

                    </div>
                    <div class="bg-green-200 h-10">

                    </div>
                </div>
            </div>
            <div class="col-span-1 bg-green-300">

            </div>
        </div>
    </section>

</template>