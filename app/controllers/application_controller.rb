class ApplicationController < ActionController::Base
  rescue_from Mongoid::Errors::DocumentNotFound, Popolo::ImproperlyNestedResource do |exception|
    respond_to do |format|
      format.html { render file: Rails.root.join('public', '404.html'), status: :not_found }
      format.json { head :not_found }
      format.atom { head :not_found }
    end
  end
  protect_from_forgery
end
