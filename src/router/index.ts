import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import PlaygroundView from '../views/PlaygroundView.vue';
import ChatView from '../views/ChatView.vue';

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: '/',
			name: 'home',
			component: HomeView,
		},
		{
			path: '/playground',
			name: 'playground',
			component: PlaygroundView,
		},
		{
			path: '/chat',
			name: 'chat',
			component: ChatView,
		},
	],
});

export default router;
