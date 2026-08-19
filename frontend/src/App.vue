<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()
const showNavBar = computed(() => route.name !== 'admin')
</script>

<template>
  <nav v-if="showNavBar" class="bg-gray-900 shadow-md sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-14">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center">
            <span class="text-white font-bold text-xl tracking-wider">BattleFilter</span>
          </div>
          <div class="hidden sm:ml-8 sm:flex sm:space-x-4 sm:items-center">
            <router-link to="/" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors" exact-active-class="bg-gray-800 text-white font-semibold">报名大厅</router-link>
            <router-link to="/board" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors" exact-active-class="bg-gray-800 text-white font-semibold">赛事看板</router-link>
            <router-link to="/auction-login" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors" exact-active-class="bg-gray-800 text-white font-semibold">拍卖登陆</router-link>
          </div>
        </div>
        <div class="flex items-center">
          <router-link to="/admin" class="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors border border-gray-700">管理后台</router-link>
        </div>
      </div>
    </div>
    
    <!-- Mobile menu -->
    <div class="sm:hidden bg-gray-800 border-t border-gray-700 flex justify-center space-x-2 p-2">
      <router-link to="/" class="text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" exact-active-class="bg-gray-900 text-white">报名大厅</router-link>
      <router-link to="/board" class="text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" exact-active-class="bg-gray-900 text-white">赛事看板</router-link>
      <router-link to="/auction-login" class="text-gray-300 hover:bg-gray-700 hover:text-white px-4 py-2 rounded-md text-sm font-medium transition-colors" exact-active-class="bg-gray-900 text-white">拍卖登陆</router-link>
    </div>
  </nav>
  
  <RouterView />
</template>

<style>
/* 全局样式 */
</style>
