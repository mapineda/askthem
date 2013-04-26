OpenGovernment::Application.routes.draw do
  devise_for :users, controllers: {
    registrations: 'registrations',
    confirmations: 'confirmations',
  }

  root to: 'pages#index'

  resources :users, only: :show
  resources :signatures, only: :create

  scope ':jurisdiction' do
    resources :bills, only: [:index, :show] do
      member do
        get 'sponsors'
      end
    end

    resources :people, only: [:index, :show] do
      member do
        get 'bills'
        get 'committees'
        get 'votes'
      end
    end

    resources :questions, only: [:index, :show, :new, :create] do
      collection do
        get :preview
      end
    end

    resources :subjects, only: [:index, :show]

    match 'overview/lower' => 'pages#lower', as: :lower_overview, via: :get
    match 'overview/upper' => 'pages#upper', as: :upper_overview, via: :get
    match 'overview/bills' => 'pages#bills', as: :bills_overview, via: :get
  end

  match ':jurisdiction' => 'pages#overview', as: :jurisdiction, via: :get
  match 'dashboard' => 'pages#dashboard', as: :dashboard, via: :get
  match 'channel' => 'pages#channel', as: :channel, via: :get
end
