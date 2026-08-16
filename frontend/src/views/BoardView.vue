<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto space-y-8">
      <!-- 页面标题 -->
      <div class="text-center">
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
          赛事看板
        </h1>
        <p class="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
          查看最新队伍分配及赛程安排
        </p>
      </div>

      <!-- 公告展示区 -->
      <div v-if="announcement" class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md shadow-sm">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <Megaphone class="h-6 w-6 text-yellow-400" />
          </div>
          <div class="ml-3 w-full">
            <h3 class="text-lg font-bold text-yellow-800">{{ announcement.title }}</h3>
            <div class="mt-2 text-sm text-yellow-700 whitespace-pre-wrap">{{ announcement.content }}</div>
            <div v-if="announcement.start_time" class="mt-4 text-sm font-medium text-yellow-800 bg-yellow-100 inline-block px-3 py-1.5 rounded">
              赛事开始时间：{{ new Date(announcement.start_time).toLocaleString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- 5V5 / 6V6 赛事面板 -->
      <section v-for="modeInfo in boardModes" :key="modeInfo.mode" class="bg-white shadow rounded-lg overflow-hidden">
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 class="text-xl font-bold leading-6 text-gray-900">
            {{ modeInfo.label }} 赛事面板
          </h2>
        </div>
        <div class="p-6 space-y-8">
          <!-- 队伍展示区 -->
          <div>
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-gray-900">队伍阵容</h3>
              <div class="flex items-center space-x-2" v-if="getUniqueGroups(modeInfo.mode).length > 0">
                <span class="text-sm text-gray-500 font-medium">按对战组筛选:</span>
                <select v-model="selectedGroupIds[modeInfo.mode]" class="border border-gray-300 rounded-md text-sm py-1 pl-2 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="all">显示全部</option>
                  <option v-for="(groupId, index) in getUniqueGroups(modeInfo.mode)" :key="groupId" :value="groupId">
                    对战组 {{ index + 1 }}
                  </option>
                </select>
              </div>
            </div>
            <div v-if="getFilteredTeams(modeInfo.mode).length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div v-for="team in getFilteredTeams(modeInfo.mode)" :key="team.id" class="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <h4 class="text-lg font-semibold text-blue-600 mb-4 border-b pb-2">{{ team.name }}</h4>
                <ul class="space-y-2">
                  <li v-for="player in team.players" :key="`${team.id}-${player.id}`" class="flex justify-between items-center text-sm">
                    <span class="text-gray-700 font-medium">{{ player.name }}</span>
                    <span class="text-gray-500 text-xs px-2 py-1 bg-gray-200 rounded-full">{{ player.role }}</span>
                  </li>
                </ul>
              </div>
            </div>
            <div v-else class="text-center py-10 text-gray-500">
              暂无队伍数据
            </div>
          </div>

          <!-- 赛程展示区 -->
          <div>
            <h3 class="text-lg font-bold text-gray-900 mb-4">赛程安排</h3>
            <div v-if="schedulesByMode[modeInfo.mode].length > 0" class="space-y-4">
              <div v-for="match in schedulesByMode[modeInfo.mode]" :key="match.id" class="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div class="text-sm text-gray-500 mb-2 sm:mb-0 w-32 font-medium">{{ match.time }}</div>
                <div class="flex items-center space-x-4 flex-1 justify-center">
                  <span class="text-lg font-bold text-gray-800 w-32 text-right">{{ match.teamA }}</span>
                  <div class="flex flex-col items-center justify-center">
                    <span v-if="match.scoreA !== undefined && match.scoreB !== undefined && match.scoreA !== null && match.scoreB !== null" class="text-xl font-bold text-blue-600 px-4">
                      {{ match.scoreA }} : {{ match.scoreB }}
                    </span>
                    <span v-else class="text-gray-400 font-semibold px-4">VS</span>
                  </div>
                  <span class="text-lg font-bold text-gray-800 w-32 text-left">{{ match.teamB }}</span>
                </div>
                <div class="mt-2 sm:mt-0 w-24 text-right">
                  <span :class="getStatusClass(match.status)" class="px-3 py-1 text-xs font-semibold rounded-full">
                    {{ match.statusText }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-10 text-gray-500">
              暂无赛程安排
            </div>
          </div>
        </div>
      </section>

      <!-- 已报名选手展示区 -->
      <section class="bg-white shadow rounded-lg overflow-hidden mb-12">
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 class="text-xl font-bold leading-6 text-gray-900">
            已报名选手
          </h2>
        </div>
        <div class="p-6">
          <div v-if="registeredPlayers.length > 0" class="flex flex-wrap gap-3">
            <span v-for="player in registeredPlayers" :key="player.battleTag" class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
              {{ player.battleTag }}
            </span>
          </div>
          <div v-else class="text-center py-10 text-gray-500">
            暂无已报名选手
          </div>
        </div>
      </section>

      <!-- Footer -->
      <SponsorFooter 
        :donators="footerData.donators" 
        :operators="footerData.operators" 
        :adminContacts="footerData.adminContacts" 
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Megaphone } from 'lucide-vue-next';
import request from '../api/request';
import SponsorFooter from '../components/SponsorFooter.vue'

type TeamMode = '5v5' | '6v6';

const boardModes: { mode: TeamMode; label: string }[] = [
  { mode: '5v5', label: '5V5' },
  { mode: '6v6', label: '6V6' }
];

const roleMap: Record<string, string> = {
  tank: '重装',
  damage: '输出',
  support: '支援',
  flex: '补位'
};

// 接口定义
interface Player {
  id: number;
  name: string;
  role: string;
}

interface Team {
  id: number;
  name: string;
  groupId: string;
  players: Player[];
}

interface Match {
  id: number;
  time: string;
  teamA: string;
  teamB: string;
  status: 'pending' | 'ongoing' | 'finished' | 'completed';
  statusText: string;
  scoreA?: number;
  scoreB?: number;
}

// 响应式数据
const teamsByMode = ref<Record<TeamMode, Team[]>>({ '5v5': [], '6v6': [] });
const schedulesByMode = ref<Record<TeamMode, Match[]>>({ '5v5': [], '6v6': [] });
const selectedGroupIds = ref<Record<TeamMode, string>>({ '5v5': 'all', '6v6': 'all' });
const announcement = ref<any>(null);
const registeredPlayers = ref<any[]>([]);

const footerData = ref({
  donators: [],
  operators: [],
  adminContacts: []
})

const translateRole = (role: string) => roleMap[role] || role || '未知';

const getUniqueGroups = (mode: TeamMode) => {
  const groups = new Set<string>();
  teamsByMode.value[mode].forEach(t => {
    if (t.groupId) groups.add(t.groupId);
  });
  return Array.from(groups);
};

const getFilteredTeams = (mode: TeamMode) => {
  if (selectedGroupIds.value[mode] === 'all') {
    return teamsByMode.value[mode];
  }
  return teamsByMode.value[mode].filter(t => t.groupId === selectedGroupIds.value[mode]);
};

const mapMatch = (m: any): Match => {
  let statusText = '未开始';
  if (m.status === 'ongoing') statusText = '进行中';
  if (m.status === 'finished' || m.status === 'completed') statusText = '已结束';

  return {
    id: m.id,
    time: '待定',
    teamA: m.teamAName,
    teamB: m.teamBName,
    status: m.status,
    statusText,
    scoreA: m.scoreA,
    scoreB: m.scoreB
  };
};

const fetchModeBoardData = async (mode: TeamMode) => {
  const teamsRes: any = await request.get(`/board/teams?mode=${mode}`);
  if (teamsRes.success) {
    teamsByMode.value[mode] = teamsRes.data.map((t: any) => ({
      id: t.id,
      name: t.name,
      groupId: t.group_id,
      players: t.members?.map((m: any) => ({
        id: m.id,
        name: m.nickname,
        role: translateRole(m.assignedRole || m.role)
      })) || []
    }));
  }

  const matchesRes: any = await request.get(`/board/matches?mode=${mode}`);
  if (matchesRes.success) {
    schedulesByMode.value[mode] = matchesRes.data.map(mapMatch);
  }
};

const fetchBoardData = async () => {
  try {
    const annRes: any = await request.get('/announcements');
    if (annRes.success && annRes.data) {
      announcement.value = annRes.data;
    }

    for (const modeInfo of boardModes) {
      await fetchModeBoardData(modeInfo.mode);
    }

    const regsRes: any = await request.get('/board/registrations');
    if (regsRes.success) {
      registeredPlayers.value = regsRes.data;
    }

    const footerRes: any = await request.get('/footer');
    if (footerRes.success && footerRes.data) {
      footerData.value = footerRes.data;
    }
  } catch (error) {
    console.error('获取看板数据失败', error);
  }
};

const getStatusClass = (status: Match['status']) => {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-800';
    case 'ongoing': return 'bg-green-100 text-green-800';
    case 'finished': 
    case 'completed': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

onMounted(() => {
  fetchBoardData();
});
</script>

<style scoped>
</style>
