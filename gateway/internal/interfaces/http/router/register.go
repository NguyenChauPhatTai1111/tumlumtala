package router

import "github.com/gin-gonic/gin"

type PublicRegistrar interface {
	RegisterPublicRoutes(router *gin.RouterGroup)
}

type InternalRegistrar interface {
	RegisterInternalRoutes(router *gin.RouterGroup)
}

type Module interface {
	PublicRegistrar
	InternalRegistrar
}

func RegisterModules(public *gin.RouterGroup, internal *gin.RouterGroup, modules ...Module) {
	for _, module := range modules {
		module.RegisterPublicRoutes(public)
		module.RegisterInternalRoutes(internal)
	}
}
